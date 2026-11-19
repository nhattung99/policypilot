import { z } from "zod";

export const categories = ["developer-tools", "api-services", "gambling", "personal", "other"] as const;
export const evidenceTypes = ["vendor-page", "business-purpose"];
export const sources = ["https://github.com/pricing", "https://developers.openai.com/api/docs/pricing", "https://claude.com/pricing"] as const;
const text = (max: number) => z.string().trim().min(1, "Required").max(max);
export const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const address = z.string().regex(/^0x[0-9a-f]{40}$/i, "Enter a wallet address").refine(value => !/^0x0{40}$/.test(value), "Use a nonzero address");
const selections = z.array(z.enum(categories)).max(categories.length);
export const money = z.string().trim().regex(/^\d{1,11}(\.\d{1,2})?$/, "Enter USD with up to two decimal places")
  .transform(value => {
    const [whole, cents = ""] = value.split(".");
    return BigInt(whole) * 100n + BigInt(cents.padEnd(2, "0"));
  }).refine(value => value > 0n && value <= 1_000_000_000_000n, "Enter an amount from $0.01 to $10 billion");
export const workspaceSchema = z.object({ name: text(80), description: text(400) });
export const agentSchema = workspaceSchema.extend({ workspace: id, operator: address, categories: selections.min(1) });
export const policySchema = z.object({ workspace: id, title: text(100), policy: text(4500), threshold: money,
  prohibited: selections, rules: text(1200), effective: z.number().int().min(0).max(253402300799) });
export const requestSchema = z.object({ workspace: id, agent: id, policy: id, category: z.enum(categories),
  vendor: text(100), product: text(160), amount: money, purpose: text(600), evidence: z.enum(sources),
  explanation: z.string().trim().max(800) });
export const noteSchema = text(600);
export const usd = (minor: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(minor / 100);
