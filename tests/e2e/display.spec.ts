import { test, expect } from "@playwright/test";

const email = process.env.ADMIN_EMAIL || "admin@example.com";
const password = process.env.ADMIN_PASSWORD || "adminpassword12";

test.describe("Display renderer", () => {
  test("valid token shows clock; disabled and invalid show errors", async ({
    page,
    browser,
  }) => {
    await page.goto("/login");
    await page.getByLabel("邮箱").fill(email);
    await page.getByLabel("密码").fill(password);
    await page.getByRole("button", { name: "登录" }).click();
    await page.waitForURL(/\/admin/, { timeout: 30000 });

    const boardName = `Display E2E ${Date.now()}`;
    await page.getByTestId("new-dashboard-name").fill(boardName);
    await page.getByTestId("create-dashboard").click();
    await expect(page.getByText(boardName)).toBeVisible({ timeout: 15000 });

    const row = page.locator("li", { hasText: boardName });
    await row.getByRole("link", { name: "编辑" }).click();
    await page.waitForURL(/\/admin\/dashboards\//, { timeout: 30000 });
    await expect(page.getByTestId("dashboard-name")).toContainText(boardName, {
      timeout: 30000,
    });

    const dashUrl = page.url();
    const dashId = dashUrl.split("/admin/dashboards/")[1]?.split(/[?#]/)[0];
    expect(dashId).toBeTruthy();

    await page.getByTestId("add-widget").click();
    await page.getByTestId("add-type-clock").click();
    await expect(page.locator("[data-testid^=widget-card-]")).toHaveCount(1, {
      timeout: 15000,
    });

    const tokenRes = await page.request.post(
      `/api/dashboards/${dashId}/display-tokens`,
      { data: { name: "e2e" } },
    );
    expect(tokenRes.ok()).toBeTruthy();
    const tokenBody = (await tokenRes.json()) as {
      token: string;
      displayUrl: string;
      id: string;
    };
    expect(tokenBody.token).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenBody.displayUrl).toContain("/display/");

    const anon = await browser.newContext();
    const displayPage = await anon.newPage();
    await displayPage.goto(tokenBody.displayUrl);
    await expect(displayPage.getByTestId("display-board")).toBeVisible({
      timeout: 30000,
    });
    await expect(
      displayPage.locator("[data-widget-type=clock]").first(),
    ).toBeVisible({ timeout: 15000 });

    const disableRes = await page.request.patch(
      `/api/dashboards/${dashId}/display-tokens/${tokenBody.id}`,
      { data: { isActive: false } },
    );
    expect(disableRes.ok()).toBeTruthy();

    await displayPage.reload();
    await expect(displayPage.getByTestId("display-error")).toBeVisible({
      timeout: 15000,
    });
    await expect(displayPage.getByText("已被禁用")).toBeVisible();

    await displayPage.goto("/display/notavalidtokenatall000");
    await expect(displayPage.getByTestId("display-error")).toBeVisible({
      timeout: 15000,
    });
    await expect(displayPage.getByText("链接无效或已失效")).toBeVisible();

    await anon.close();
  });
});
