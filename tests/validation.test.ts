import assert from "node:assert/strict";
import test from "node:test";
import { agentSchema, money, policySchema, requestSchema, sources, workspaceSchema } from "../lib/validation";
import { newestIds } from "../lib/genlayer/contracts";
import { assessReceipt } from "../lib/genlayer/transactions";
import { TransactionStatus } from "genlayer-js/types";

test("works with exact minor units and rejects rounding and invalid amounts", () => {
  assert.equal(money.parse("29.01"), 2901n);
  assert.equal(money.parse("0.01"), 1n);
  for (const input of ["0", "-1", "1.234", "1e2", "10000000000.01"]) {
    assert.equal(money.safeParse(input).success, false);
  }
});

test("workspace and agent editor require meaningful text and an authorized category selection", () => {
  assert.equal(workspaceSchema.safeParse({ name: " ", description: "Description" }).success, false);
  const fields = { workspace: 1, name: "Buyer", description: "Procurement", operator: "0x" + "1".repeat(40) };
  assert.equal(agentSchema.safeParse({ ...fields, categories: [] }).success, false);
  assert.equal(agentSchema.safeParse({ ...fields, categories: ["developer-tools"] }).success, true);
});

test("policy and request validation produce safe SDK arguments", () => {
  const policy = policySchema.parse({ workspace: 1, title: "Procurement", policy: "Use developer tools",
    threshold: "100", prohibited: ["gambling"], rules: "Review exceptions", effective: 0 });
  assert.equal(policy.threshold, 10000n);
  const request = { workspace: 1, agent: 1, policy: 1, category: "developer-tools", vendor: "GitHub", product: "Team",
    purpose: "Software development", evidence: sources[0], amount: "29", explanation: "" };
  assert.equal(requestSchema.safeParse(request).success, true);
  assert.equal(requestSchema.safeParse({ ...request, evidence: "https://github.com/pricing?redirect=example.org" }).success, false);
});

test("history pagination has stable bounds", () => {
  assert.deepEqual(newestIds(0, 0), []);
  assert.deepEqual(newestIds(11, 1), [1]);
  assert.deepEqual(newestIds(5, 0, 3), [5, 4, 3]);
});

test("accepted and unresolved status do not finalize policy decisions", () => {
  for (const statusName of [TransactionStatus.ACCEPTED, TransactionStatus.UNDETERMINED, TransactionStatus.VALIDATORS_TIMEOUT]) {
    assert.equal(assessReceipt({ statusName }).state, "pending");
  }
});

test("a finalized receipt requires affirmative GenVM success", () => {
  const statusName = TransactionStatus.FINALIZED;
  assert.equal(assessReceipt({ statusName }).state, "unverified");
  assert.equal(assessReceipt({ status: 7, txExecutionResultName: undefined }).state, "unverified");
  const receipt = { statusName, result: 6, consensus_data: { final: true, leader_receipt: [{ execution_result: "SUCCESS" }] } };
  const sample = receipt as Parameters<typeof assessReceipt>[0];
  assert.equal(assessReceipt(sample).state, "finalized");
  assert.equal(assessReceipt({ ...sample, result: 5 }).state, "failed");
});
