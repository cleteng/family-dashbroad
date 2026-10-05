import { test, expect } from "@playwright/test";

const email = process.env.ADMIN_EMAIL || "admin@example.com";
const password = process.env.ADMIN_PASSWORD || "adminpassword12";

test.describe("Admin dashboard editor", () => {
  test("create dashboard, add clock, settings, delete", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("邮箱").fill(email);
    await page.getByLabel("密码").fill(password);
    await page.getByRole("button", { name: "登录" }).click();
    await page.waitForURL(/\/admin/);

    const name = `E2E Board ${Date.now()}`;
    await page.getByTestId("new-dashboard-name").fill(name);
    await page.getByTestId("create-dashboard").click();
    await expect(page.getByText(name)).toBeVisible();

    const row = page.locator("li", { hasText: name });
    await row.getByRole("link", { name: "编辑" }).click();
    await page.waitForURL(/\/admin\/dashboards\//);
    await expect(page.getByTestId("dashboard-name")).toContainText(name, {
      timeout: 30000,
    });

    await page.getByTestId("add-widget").click();
    await expect(page.getByTestId("add-widget-modal")).toBeVisible();
    await page.getByTestId("add-type-clock").click();
    await expect(page.locator("[data-testid^=widget-card-]")).toHaveCount(1, {
      timeout: 10000,
    });

    const card = page.locator("[data-testid^=widget-card-]").first();
    await card.getByRole("button", { name: "设置" }).click();
    await expect(page.getByTestId("settings-modal")).toBeVisible();
    const tz = page.getByTestId("settings-modal").locator('input[type="text"]');
    await tz.fill("Asia/Shanghai");
    await page.getByTestId("save-settings").click();
    await expect(page.getByTestId("settings-modal")).toHaveCount(0);

    page.once("dialog", (d) => d.accept());
    await card.getByRole("button", { name: "删除" }).click();
    await expect(page.getByTestId("empty-widgets")).toBeVisible({
      timeout: 10000,
    });
  });
});
