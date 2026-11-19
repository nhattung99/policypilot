import { TransactionHashVariant, type CalldataEncodable } from "genlayer-js/types";
import { z } from "zod";
import { address, categories, id, sources } from "../validation";
import { contractAddress, readClient } from "./client";

export type Stats = Record<"workspaces" | "agents" | "policies" | "requests" | "active_policies" |
  "evaluated" | "allow" | "deny" | "review", number>;
const timestamp = z.number().int().nonnegative().max(253402300799);
const category = z.enum(categories);
const workspaceSchema = z.object({ name: z.string(), description: z.string(), administrator: address,
  created_at: timestamp, status: z.literal("ACTIVE"), active_policy_id: z.number().int().nonnegative(),
  versions: z.number().int().nonnegative(), request_count: z.number().int().nonnegative() });
const agentSchema = z.object({ workspace_id: id, name: z.string(), operator: address, description: z.string(),
  active: z.boolean(), categories: z.array(category) });
const policySchema = z.object({ workspace_id: id, title: z.string(), text: z.string(), threshold: id,
  currency: z.literal("USD"), version: id, prohibited: z.array(category), evidence_types: z.array(z.string()),
  review_rules: z.string(), effective_at: timestamp });
const requestSchema = z.object({
  request: z.object({ workspace_id: id, agent_id: id, agent_name: z.string(), operator: address, policy_id: id,
    policy_version: id, category, vendor: z.string(), product: z.string(), amount: id, currency: z.literal("USD"),
    purpose: z.string(), explanation: z.string(), evidence_url: z.enum(sources), submitted_at: timestamp }),
  verdict: z.object({ decision: z.enum(["ALLOW", "DENY", "REVIEW"]), reason_codes: z.array(z.string()),
    summary: z.string(), policy_clauses: z.array(z.string()), evidence_quote: z.string(), evaluated_at: timestamp }).nullable(),
  review: z.object({ decision: z.enum(["HUMAN_APPROVED", "HUMAN_REJECTED"]), reviewer: address,
    reviewed_at: timestamp, note: z.string() }).nullable(),
});
const records = { get_workspace: workspaceSchema, get_agent: agentSchema, get_policy: policySchema, get_request: requestSchema };
export type RecordMap = { [K in keyof typeof records]: z.infer<(typeof records)[K]> };
export type Method = keyof RecordMap;
export type Arg = CalldataEncodable;

async function read(method: string, args: Arg[]) {
  if (!contractAddress) throw new Error("A Studionet contract address is required.");
  return readClient.readContract({ address: contractAddress, functionName: method, args,
    transactionHashVariant: TransactionHashVariant.LATEST_FINAL });
}

function decode<T>(value: unknown): T {
  if (typeof value !== "string") throw new Error("Unexpected contract response. Verify the deployed interface.");
  return JSON.parse(value) as T;
}

export async function getStats() {
  const stats = decode<Stats>(await read("get_stats", []));
  const keys = ["workspaces", "agents", "policies", "requests", "active_policies", "evaluated", "allow", "deny", "review"] as const;
  if (!stats || keys.some(key => !Number.isSafeInteger(stats[key]) || stats[key] < 0)) {
    throw new Error("Unexpected contract counters. Verify the deployed interface.");
  }
  return stats;
}

export async function getRecord<M extends Method>(method: M, id: number) {
  const raw = decode<unknown>(await read(method, [BigInt(id)]));
  const record = records[method].safeParse(raw);
  if (!record.success) throw new Error("Unexpected contract record. Verify the deployed interface.");
  return record.data as RecordMap[M];
}

export async function getRecentDecisions() {
  const result = await read("list_recent_decisions", [5n]);
  if (!Array.isArray(result)) throw new Error("Invalid recent decisions.");
  return z.array(id).max(5).parse(result.map(Number));
}

export async function getWorkspaceRequests(workspaceId: number, offset: number) {
  const result = await read("list_workspace_requests", [BigInt(workspaceId), BigInt(offset), 20n]);
  if (!Array.isArray(result)) throw new Error("Invalid workspace request page.");
  return z.array(id).max(20).parse(result.map(Number));
}

export function newestIds(count: number, page: number, size = 10) {
  const last = count - page * size;
  return Array.from({ length: Math.max(0, Math.min(size, last)) }, (_, index) => last - index);
}
