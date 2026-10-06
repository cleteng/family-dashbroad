import { test, expect } from "@playwright/test";

const email = process.env.ADMIN_EMAIL || "admin@example.com";
const password = process.env.ADMIN_PASSWORD || "adminpassword12";

test.describe("Display token management", () => {
  test("create, open display, disable, regenerate", async ({ page, browser }) => {
    await page.goto("/login");
    await page.getByLabel("邮箱").fill(email);
    await page.getByLabel("密码").fill(password);
    await page.getByRole("button", { name: "登录" }).click();
    await page.waitForURL(/\/admin/, { timeout: 30000 });

    const boardName = `Token UI ${Date.now()}`;
    await page.getByTestId("new-dashboard-name").fill(boardName);
    await page.getByTestId("create-dashboard").click();
    await expect(page.getByText(boardName)).toBeVisible({ timeout: 15000 });

    const row = page.locator("li", { hasText: boardName });
    await row.getByRole("link", { name: "编辑" }).click();
    await page.waitForURL(/\/admin\/dashboards\//, { timeout: 30000 });
    await page.getByTestId("add-widget").click();
    await page.getByTestId("add-type-clock").click();
    await expect(page.locator("[data-testid^=widget-card-]")).toHaveCount(1, {
      timeout: 15000,
    });
    await page.getByRole("link", { name: "← 看板列表" }).click();
    await page.waitForURL(/\/admin$/, { timeout: 15000 });

    const listRow = page.locator("li", { hasText: boardName });
    await listRow.getByRole("button", { name: "展示链接" }).click();
    await expect(page.getByTestId("token-manage-modal")).toBeVisible({
      timeout: 15000,
    });

    await page.getByTestId("token-new-name").fill("客厅平板");
    await page.getByTestId("token-create").click();
    await expect(page.getByTestId("token-reveal")).toBeVisible({
      timeout: 15000,
    });
    const urlInput = page.getByTestId("token-reveal-url");
    const fullUrl = await urlInput.inputValue();
    expect(fullUrl).toContain("/display/");

    const anon = await browser.newContext();
    const dpage = await anon.newPage();
    await dpage.goto(fullUrl);
    await expect(dpage.getByTestId("display-board")).toBeVisible({
      timeout: 30000,
    });

    const tokenRow = page.locator("[data-testid^=token-row-]").first();
    await tokenRow.getByRole("button", { name: "禁用" }).click();
    await dpage.reload();
    await expect(dpage.getByTestId("display-error")).toBeVisible({
      timeout: 15000,
    });
    await expect(dpage.getByText("已被禁用")).toBeVisible();

    await tokenRow.getByRole("button", { name: "启用" }).click();
    page.once("dialog", (d) => d.accept());
    await tokenRow.getByRole("button", { name: "重新生成" }).click();
    await expect(page.getByTestId("token-reveal")).toBeVisible({
      timeout: 15000,
    });
    const newUrl = await page.getByTestId("token-reveal-url").inputValue();
    expect(newUrl).not.toBe(fullUrl);

    await dpage.goto(fullUrl);
    await expect(dpage.getByText("链接无效或已失效")).toBeVisible({
      timeout: 15000,
    });

    await dpage.goto(newUrl);
    await expect(dpage.getByTestId("display-board")).toBeVisible({
      timeout: 30000,
    });

    await anon.close();
  });
});
