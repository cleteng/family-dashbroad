import { test, expect } from "@playwright/test";

const email = process.env.ADMIN_EMAIL || "admin@example.com";
const password = process.env.ADMIN_PASSWORD || "adminpassword12";

test.describe("HA sensor widget", () => {
  test("add widget when HA not configured shows HA 未连接", async ({
    page,
    browser,
  }) => {
    await page.goto("/login");
    await page.getByLabel("邮箱").fill(email);
    await page.getByLabel("密码").fill(password);
    await page.getByRole("button", { name: "登录" }).click();
    await page.waitForURL(/\/admin/, { timeout: 30000 });

    const boardName = `HA Sensor ${Date.now()}`;
    await page.getByTestId("new-dashboard-name").fill(boardName);
    await page.getByTestId("create-dashboard").click();
    await expect(page.getByText(boardName)).toBeVisible({ timeout: 15000 });

    await page
      .locator("li", { hasText: boardName })
      .getByRole("link", { name: "编辑" })
      .click();
    await page.waitForURL(/\/admin\/dashboards\//, { timeout: 30000 });

    await page.getByTestId("add-widget").click();
    await expect(page.getByTestId("add-type-ha-sensor")).toBeVisible({
      timeout: 10000,
    });
    await page.getByTestId("add-type-ha-sensor").click();

    // Without entity configured → 请选择传感器; still must not crash
    await expect(page.getByTestId("ha-sensor-widget")).toBeVisible({
      timeout: 15000,
    });

    const dashId = page.url().split("/admin/dashboards/")[1]?.split(/[?#]/)[0];
    // Set a fake entity via API so renderer hits HA proxy
    const widgetsRes = await page.request.get(
      `/api/dashboards/${dashId}/widgets`,
    );
    expect(widgetsRes.ok()).toBeTruthy();
    const { widgets } = (await widgetsRes.json()) as {
      widgets: Array<{ id: string; type: string }>;
    };
    const sensor = widgets.find((w) => w.type === "ha-sensor");
    expect(sensor).toBeTruthy();
    if (sensor) {
      await page.request.patch(
        `/api/dashboards/${dashId}/widgets/${sensor.id}`,
        {
          data: {
            config: { entityId: "sensor.fake_for_e2e", refreshInterval: 60 },
          },
        },
      );
    }

    const tokenRes = await page.request.post(
      `/api/dashboards/${dashId}/display-tokens`,
      {
        data: { name: "ha-sensor-e2e" },
      },
    );
    expect(tokenRes.ok()).toBeTruthy();
    const { displayUrl } = (await tokenRes.json()) as { displayUrl: string };

    const anon = await browser.newContext();
    const dpage = await anon.newPage();
    await dpage.goto(displayUrl);
    await expect(dpage.getByTestId("display-board")).toBeVisible({
      timeout: 30000,
    });
    await expect(dpage.locator("[data-widget-type=ha-sensor]")).toBeVisible({
      timeout: 15000,
    });
    // HA not configured → friendly message, no crash
    await expect(dpage.getByTestId("ha-sensor-widget")).toBeVisible({
      timeout: 20000,
    });
    await expect(dpage.getByText("HA 未连接")).toBeVisible({ timeout: 20000 });
    await anon.close();
  });
});
