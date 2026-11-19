import { expect, test } from "@playwright/test";
test.skip(process.env.POLICYPILOT_BROWSER_CONFIGURED === "1" || process.env.POLICYPILOT_BROWSER_LIVE === "1", "Requires the deployment-pending fixture.");

test("all required routes and honest deployment-pending states", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Every autonomous decision needs a rulebook." })).toBeVisible();
  await page.getByRole("link", { name: "Open dashboard" }).first().click();
  await expect(page.getByRole("heading", { name: "Decision dashboard" })).toBeVisible();
  await expect(page.getByText("Contract deployment pending")).toBeVisible();
  await expect(page.getByText("On-chain records will appear after deployment.")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Connect wallet" })).toBeVisible();
  const routes = ["/workspaces/new", "/workspaces/1", "/agents", "/policies", "/policies/new",
    "/requests", "/requests/new", "/requests/1", "/how-it-works"];
  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("wallet connection changes account display while writes remain unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "ethereum", { value: {
      request: async ({ method }: { method: string }) => {
        if (method === "eth_accounts") return [];
        if (method === "eth_requestAccounts") return ["0x" + "1".repeat(40)];
        throw new Error("Unexpected wallet request");
      },
    } });
  });
  await page.goto("/workspaces/new");
  await page.getByRole("button", { name: "Connect wallet" }).click();
  await expect(page.getByRole("button", { name: "0x1111…1111" })).toBeVisible();
  await page.getByLabel("Business name").fill("NovaWorks AI");
  await page.getByLabel("Description").fill("Developer tools");
  await page.getByRole("button", { name: "Validate inputs" }).click();
  await expect(page.getByText("Inputs are valid.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create workspace" })).toHaveCount(0);
});

test("mobile navigation and policy validation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  const toggle = page.getByRole("button", { name: "Toggle navigation" });
  await expect(toggle).toBeVisible();
  await toggle.click();
  await page.getByRole("navigation", { name: "Workspace" }).getByRole("link", { name: "Policies" }).click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("link", { name: "New policy" }).click();
  await page.getByLabel("Workspace ID").fill("1");
  await page.getByLabel("Policy title").fill("Procurement");
  await page.getByLabel("Natural-language policy").fill("Developer tools are permitted.");
  await page.getByLabel("Automatic approval limit (USD)").fill("1.123");
  await page.getByLabel("Additional review rules").fill("Review unclear evidence.");
  await page.getByRole("button", { name: "Validate inputs" }).click();
  await expect(page.getByText("Enter USD with up to two decimal places", { exact: false })).toBeVisible();
  expect(await page.locator("body").evaluate(body => body.scrollWidth)).toBeLessThanOrEqual(390);
});

test("missing wallet returns an actionable error", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Connect wallet" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Install a browser wallet" })).toHaveText("Install a browser wallet such as MetaMask.");
});
