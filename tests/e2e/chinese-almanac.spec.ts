import { test, expect } from "@playwright/test";

const email = process.env.ADMIN_EMAIL || "admin@example.com";
const password = process.env.ADMIN_PASSWORD || "adminpassword12";

test.describe("Chinese almanac widget", () => {
  test("add in editor and show on display without 福到万家", async ({ page, browser }) => {
    await page.goto("/login");
    await page.getByLabel("邮箱").fill(email);
    await page.getByLabel("密码").fill(password);
    await page.getByRole("button", { name: "登录" }).click();
    await page.waitForURL(/\/admin/, { timeout: 30000 });

    const boardName = `Almanac ${Date.now()}`;
    await page.getByTestId("new-dashboard-name").fill(boardName);
    await page.getByTestId("create-dashboard").click();
    await expect(page.getByText(boardName)).toBeVisible({ timeout: 15000 });

    await page.locator("li", { hasText: boardName }).getByRole("link", { name: "编辑" }).click();
    await page.waitForURL(/\/admin\/dashboards\//, { timeout: 30000 });

    await page.getByTestId("add-widget").click();
    await expect(page.getByTestId("add-type-chinese-almanac")).toBeVisible({
      timeout: 10000,
    });
    await page.getByTestId("add-type-chinese-almanac").click();
    await expect(page.getByTestId("chinese-almanac-widget")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("福到万家")).toHaveCount(0);

    const dashId = page.url().split("/admin/dashboards/")[1]?.split(/[?#]/)[0];
    const tokenRes = await page.request.post(`/api/dashboards/${dashId}/display-tokens`, {
      data: { name: "almanac-e2e" },
    });
    expect(tokenRes.ok()).toBeTruthy();
    const { displayUrl } = (await tokenRes.json()) as { displayUrl: string };

    const anon = await browser.newContext();
    const dpage = await anon.newPage();
    await dpage.goto(displayUrl);
    await expect(dpage.getByTestId("display-board")).toBeVisible({
      timeout: 30000,
    });
    await expect(dpage.locator("[data-widget-type=chinese-almanac]")).toBeVisible({
      timeout: 15000,
    });
    await expect(dpage.getByText("福到万家")).toHaveCount(0);
    await anon.close();
  });
});
