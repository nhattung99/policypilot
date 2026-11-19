import { expect, test } from "@playwright/test";
import { abi } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

test.skip(process.env.POLICYPILOT_BROWSER_LIVE !== "1", "Requires public Studionet RPC.");

test("dashboard reflects live finalized Studionet counters before and after refresh", async ({ page }) => {
  const rpc = studionet.rpcUrls.default.http[0];
  const statsCall = abi.transactions.serialize([abi.calldata.encode(abi.calldata.makeCalldataObject("get_stats", [], undefined)), false]);
  for (const refresh of [false, true]) {
    const statsResponse = page.waitForResponse(response => {
      if (response.url() !== rpc || response.request().method() !== "POST") return false;
      const call = response.request().postDataJSON();
      return call.method === "gen_call" && call.params[0].data === statsCall &&
        call.params[0].transaction_hash_variant === "latest-final";
    });
    await (refresh ? page.reload() : page.goto("/dashboard"));
    const payload = await (await statsResponse).json();
    expect(payload.error).toBeUndefined();
    const raw = typeof payload.result === "string" ? payload.result : payload.result.data;
    const value = abi.calldata.decode(Buffer.from(raw.replace(/^0x/, ""), "hex"));
    expect(typeof value).toBe("string");
    const counters = JSON.parse(String(value));
    for (const [label, key] of [
      ["Active workspaces", "workspaces"], ["Registered agents", "agents"], ["Active policies", "active_policies"],
      ["Evaluated requests", "evaluated"], ["Allowed", "allow"], ["Denied", "deny"], ["Review verdicts", "review"],
    ]) {
      await expect(page.getByText(label, { exact: true }).locator("..").getByText(String(counters[key]), { exact: true })).toBeVisible();
    }
    await expect(page.getByText("Contract unavailable", { exact: true })).toHaveCount(0);
  }
  await expect(page.getByRole("button", { name: "Connect wallet" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.getByRole("navigation", { name: "Workspace" }).getByRole("link", { name: "Requests" }).click();
  await expect(page.getByRole("heading", { name: "Action requests" })).toBeVisible();
});
