import { test, expect } from "@playwright/test";

const email = process.env.ADMIN_EMAIL || "admin@example.com";
const password = process.env.ADMIN_PASSWORD || "adminpassword12";

test.describe("Weather widget", () => {
  test("add in editor and show on display", async ({ page, browser }) => {
    await page.goto("/login");
    await page.getByLabel("邮箱").fill(email);
    await page.getByLabel("密码").fill(password);
    await page.getByRole("button", { name: "登录" }).click();
    await page.waitForURL(/\/admin/, { timeout: 30000 });

    const boardName = `Weather ${Date.now()}`;
    await page.getByTestId("new-dashboard-name").fill(boardName);
    await page.getByTestId("create-dashboard").click();
    await expect(page.getByText(boardName)).toBeVisible({ timeout: 15000 });

    await page.locator("li", { hasText: boardName }).getByRole("link", { name: "编辑" }).click();
    await page.waitForURL(/\/admin\/dashboards\//, { timeout: 30000 });

    await page.getByTestId("add-widget").click();
    await expect(page.getByTestId("add-type-weather")).toBeVisible({
      timeout: 10000,
    });
    await page.getByTestId("add-type-weather").click();
    // Widget card appears (may be loading or ready or unavailable — must not crash)
    await expect(page.getByTestId("weather-widget")).toBeVisible({
      timeout: 20000,
    });

    const dashId = page.url().split("/admin/dashboards/")[1]?.split(/[?#]/)[0];
    const tokenRes = await page.request.post(`/api/dashboards/${dashId}/display-tokens`, {
      data: { name: "weather-e2e" },
    });
    expect(tokenRes.ok()).toBeTruthy();
    const { displayUrl } = (await tokenRes.json()) as { displayUrl: string };

    const anon = await browser.newContext();
    const dpage = await anon.newPage();
    await dpage.goto(displayUrl);
    await expect(dpage.getByTestId("display-board")).toBeVisible({
      timeout: 30000,
    });
    await expect(dpage.locator("[data-widget-type=weather]")).toBeVisible({
      timeout: 15000,
    });
    // Either live data or friendly fallback — never blank crash
    await expect(dpage.getByTestId("weather-widget")).toBeVisible({
      timeout: 20000,
    });
    const state = await dpage.getByTestId("weather-widget").getAttribute("data-state");
    expect(["ready", "unavailable", "loading"]).toContain(state);
    await anon.close();
  });
});
