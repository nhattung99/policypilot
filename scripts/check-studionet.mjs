import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionHashVariant } from "genlayer-js/types";

const address = process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS?.trim();
assert.match(address ?? "", /^0x[0-9a-fA-F]{40}$/, "A Studionet contract address is required");
assert.notEqual(address, "0x" + "0".repeat(40));
const client = createClient({ chain: studionet });
const [schema, code] = await Promise.all([
  client.getContractSchema(address),
  client.getContractCode(address),
]);
const normalize = source => source.replaceAll("\r", "").trim();
assert.equal(normalize(code), normalize(readFileSync(new URL("../contracts/policy_pilot.py", import.meta.url), "utf8")),
  "Deployed source differs from the local contract");
assert.deepEqual(schema.ctor.params, []);
const list = type => [{ $rep: type }];
const signatures = {
  get_stats: [true, [], "string"],
  get_workspace: [true, ["int"], "string"],
  get_agent: [true, ["int"], "string"],
  get_policy: [true, ["int"], "string"],
  get_request: [true, ["int"], "string"],
  list_workspace_requests: [true, ["int", "int", "int"], list("int")],
  list_recent_decisions: [true, ["int"], list("int")],
  create_workspace: [false, ["string", "string"], "int"],
  register_agent: [false, ["int", "string", "string", "address", list("string")], "int"],
  update_agent_status: [false, ["int", "int", "bool"], "null"],
  create_policy: [false, ["int", "string", "string", "string", "int", list("string"), list("string"), "string", "int"], "int"],
  activate_policy: [false, ["int", "int"], "null"],
  submit_request: [false, ["int", "int", "int", "string", "string", "string", "int", "string", "string", "string", "string", "string"], "int"],
  evaluate_request: [false, ["int"], "null"],
  review_request: [false, ["int", "bool", "string"], "null"],
};
assert.equal(Object.keys(schema.methods).length, Object.keys(signatures).length);
for (const [name, [readonly, args, returns]] of Object.entries(signatures)) {
  const method = schema.methods[name];
  assert.ok(method, name);
  assert.equal(method.readonly, readonly, name);
  assert.deepEqual(method.params.map(([, type]) => type), args, name);
  assert.deepEqual(method.kwparams, {}, name);
  assert.deepEqual(method.ret, returns, name);
  if (!readonly) assert.equal(method.payable, false, name);
}
const read = (functionName, args = []) => client.readContract({
  address, functionName, args, transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
});
const stats = JSON.parse(await read("get_stats"));
for (const key of ["workspaces", "agents", "policies", "requests", "active_policies", "evaluated", "allow", "deny", "review"]) {
  assert.ok(Number.isSafeInteger(stats[key]) && stats[key] >= 0, key);
}
assert.equal(stats.allow + stats.deny + stats.review, stats.evaluated);
const recent = await read("list_recent_decisions", [5n]);
assert.ok(Array.isArray(recent) && recent.length <= 5);
if (stats.workspaces) {
  const first = JSON.parse(await read("get_workspace", [1n]));
  assert.match(first.administrator, /^0x[0-9a-f]{40}$/i);
}
if (recent.length) {
  const latest = JSON.parse(await read("get_request", [BigInt(recent[0])]));
  assert.ok(["ALLOW", "DENY", "REVIEW"].includes(latest.verdict?.decision));
}
console.log(JSON.stringify({ network: "studionet", address, interfaceMethods: Object.keys(signatures).length, stats, recent }, null, 2));
