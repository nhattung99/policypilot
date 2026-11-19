import { expect, test } from "@playwright/test";
import { abi } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const configured = process.env.POLICYPILOT_BROWSER_CONFIGURED === "1" && process.env.POLICYPILOT_BROWSER_LIVE !== "1";
const owner = "0x" + "a".repeat(40);
const operator = "0x" + "b".repeat(40);
const when = 1780000000;

test.skip(!configured, "Requires the isolated configured-contract fixture.");

test("finalized counts and review details use the configured read endpoint", async ({ page }) => {
  await page.addInitScript(account => {
    Object.defineProperty(window, "ethereum", { value: {
      request: async ({ method }: { method: string }) => {
        if (method === "eth_accounts" || method === "eth_requestAccounts") return [account];
        if (method === "eth_chainId") return "0xf22f";
        throw new Error("Wallet setup declined");
      },
    } });
  }, owner);
  const encodeCall = (method: string, args: bigint[] = []) =>
    abi.transactions.serialize([abi.calldata.encode(abi.calldata.makeCalldataObject(method, args, undefined)), false]);
  const reads = new Map<string, unknown>([
    [encodeCall("list_recent_decisions", [5n]), [1]],
    [encodeCall("get_stats"), { workspaces: 1, agents: 1, policies: 1, requests: 1, active_policies: 1, evaluated: 1, allow: 0, deny: 0, review: 1 }],
    [encodeCall("get_workspace", [1n]), { name: "NovaWorks AI", description: "Procurement", administrator: owner,
      created_at: when, status: "ACTIVE", active_policy_id: 1, versions: 1, request_count: 1 }],
    [encodeCall("get_request", [1n]), { request: { workspace_id: 1, agent_id: 1, agent_name: "Buyer", operator,
      policy_id: 1, policy_version: 1, category: "developer-tools", vendor: "GitHub", product: "Team", amount: 25000,
      currency: "USD", purpose: "Developer collaboration", explanation: "", evidence_url: "https://github.com/pricing", submitted_at: when },
      verdict: { decision: "REVIEW", reason_codes: ["HUMAN_APPROVAL_REQUIRED"],
        summary: "The request exceeds the spending threshold.", policy_clauses: ["spending_threshold"],
        evidence_quote: "", evaluated_at: when }, review: null }],
  ]);
  await page.route(studionet.rpcUrls.default.http[0], async route => {
    const rpc = route.request().postDataJSON();
    if (rpc.method !== "gen_call") throw new Error(`Unexpected RPC call: ${rpc.method}`);
    const call = rpc.params[0];
    expect(call.transaction_hash_variant).toBe("latest-final");
    const value = reads.get(call.data);
    expect(value).toBeDefined();
    const result = Buffer.from(abi.calldata.encode(Array.isArray(value) ? value : JSON.stringify(value))).toString("hex");
    await route.fulfill({ json: { jsonrpc: "2.0", id: rpc.id, result }, headers: { "access-control-allow-origin": "*" } });
  });
  await page.goto("/dashboard");
  await expect(page.getByText("Contract deployment pending")).toHaveCount(0);
  await expect(page.getByText("Evaluated requests").locator("..")).toContainText("1");
  await page.getByRole("link", { name: "#1 · Team" }).click();
  await expect(page.getByText("HUMAN_APPROVAL_REQUIRED")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Administrator review" })).toBeVisible();
  await page.getByLabel("Review note").fill("Approved for testing.");
  await page.getByRole("button", { name: "Approve request" }).click();
  await expect(page.getByText("Wallet setup declined")).toBeVisible();
  await expect(page.getByText("No human decision recorded.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("HUMAN_APPROVAL_REQUIRED")).toBeVisible();
});

test("a configured RPC failure is surfaced instead of showing zero counters", async ({ page }) => {
  await page.route(studionet.rpcUrls.default.http[0], route => route.fulfill({
    json: { jsonrpc: "2.0", id: 1, error: { code: -32000, message: "Test RPC unavailable" } },
    headers: { "access-control-allow-origin": "*" },
  }));
  await page.goto("/dashboard");
  await expect(page.getByText("Contract unavailable", { exact: true })).toBeVisible();
});
