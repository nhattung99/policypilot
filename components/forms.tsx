"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { z } from "zod";
import { CalldataAddress } from "genlayer-js/types";
import { Button, Card } from "./ui/primitives";
import { useSession, message } from "./shell";
import { categories, sources, evidenceTypes, workspaceSchema, agentSchema, policySchema, requestSchema } from "@/lib/validation";
import type { Arg } from "@/lib/genlayer/contracts";

export function Field({ label, name, children, max, type = "text", defaultValue, optional = false }: {
  label: string; name: string; children?: ReactNode; max?: number; type?: string; defaultValue?: string; optional?: boolean;
}) {
  return <label className="field"><span>{label}</span>{children ??
    <input name={name} type={type} maxLength={max} defaultValue={defaultValue} required={!optional} />}</label>;
}

function Area({ label, name, max, optional }: { label: string; name: string; max: number; optional?: boolean }) {
  return <Field label={label} name={name}><textarea name={name} rows={4} maxLength={max} required={!optional} /></Field>;
}

function Categories({ label, name }: { label: string; name: string }) {
  return <fieldset className="choices"><legend>{label}</legend>{categories.map(category =>
    <label key={category}><input type="checkbox" name={name} value={category} />{category}</label>)}</fieldset>;
}

const value = (form: FormData, name: string) => String(form.get(name) ?? "");
const values = (form: FormData, name: string) => form.getAll(name).map(String);

export function Form({ action, fields, children }: { action: string;
  fields: (form: FormData) => [method: string, args: Arg[]]; children: ReactNode }) {
  const { ready, busy, write } = useSession();
  const [feedback, setFeedback] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    try {
      const [method, args] = fields(new FormData(event.currentTarget));
      if (!ready) {
        setFeedback("Inputs are valid. A configured contract and connected wallet are required to submit.");
        return;
      }
      await write(method, args, action);
    } catch (error) {
      setFeedback(error instanceof z.ZodError ? error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join(" · ") : message(error));
    }
  }
  return <Card className="form-card"><form onSubmit={submit}>
    {children}
    <div className="form-actions"><Button type="submit" disabled={busy}>{ready ? action : "Validate inputs"}</Button>
      {!ready && <span>On-chain submission is unavailable.</span>}</div>
    {feedback && <p className="feedback" role="status">{feedback}</p>}
  </form></Card>;
}

export function WorkspaceForm() {
  return <Form action="Create workspace" fields={form => {
    const row = workspaceSchema.parse({ name: value(form, "name"), description: value(form, "description") });
    return ["create_workspace", [row.name, row.description]];
  }}>
    <Field label="Business name" name="name" max={80} /><Area label="Description" name="description" max={400} />
    <p className="muted">The signing wallet becomes the workspace administrator.</p>
  </Form>;
}

export function AgentForm() {
  return <Form action="Register agent" fields={form => {
    const row = agentSchema.parse({ workspace: Number(value(form, "workspace")), name: value(form, "name"),
      description: value(form, "description"), operator: value(form, "operator"), categories: values(form, "categories") });
    const operator = new CalldataAddress(Uint8Array.from(row.operator.slice(2).match(/../g)!, byte => parseInt(byte, 16)));
    return ["register_agent", [BigInt(row.workspace), row.name, row.description, operator, row.categories]];
  }}>
    <div className="field-grid"><Field label="Workspace ID" name="workspace" type="number" /><Field label="Agent name" name="name" max={80} /></div>
    <Area label="Description" name="description" max={400} /><Field label="Operator wallet" name="operator" max={42} />
    <Categories label="Allowed action categories" name="categories" />
    <p className="muted">Registration authorizes an operator wallet to submit requests for this agent.</p>
  </Form>;
}

export function PolicyForm({ workspaceId, nextVersion }: { workspaceId?: string; nextVersion?: number }) {
  return <Form action="Create policy draft" fields={form => {
    const localDate = value(form, "effective");
    const row = policySchema.parse({ workspace: Number(value(form, "workspace")), title: value(form, "title"),
      policy: value(form, "policy"), threshold: value(form, "threshold"), prohibited: values(form, "prohibited"),
      rules: value(form, "rules"), effective: localDate ? Math.floor(new Date(localDate).getTime() / 1000) : 0 });
    return ["create_policy", [BigInt(row.workspace), row.title, row.policy, "USD", row.threshold, row.prohibited,
      evidenceTypes, row.rules, BigInt(row.effective)]];
  }}>
    <div className="field-grid"><Field label="Workspace ID" name="workspace" type="number" defaultValue={workspaceId} />
      <Field label="Policy title" name="title" max={100} /></div>
    <Area label="Natural-language policy" name="policy" max={4500} />
    <div className="field-grid"><Field label="Automatic approval limit (USD)" name="threshold" />
      <Field label="Earliest activation (optional, local time)" name="effective" type="datetime-local" optional /></div>
    <Categories label="Prohibited categories" name="prohibited" />
    <div className="notice"><strong>Required evidence</strong><span>Public vendor page and a business purpose.</span></div>
    <Area label="Additional review rules" name="rules" max={1200} />
    <p className="muted">{nextVersion ? `Current version preview: v${nextVersion}. ` : ""}The contract assigns the next version at creation. Draft contents are immutable, and activation affects future requests.</p>
  </Form>;
}

export function RequestForm({ workspaceId, activePolicy }: { workspaceId?: string; activePolicy?: number }) {
  // Keep the same nonce for retrying the same validated submission in this form.
  const [submission, setSubmission] = useState<{ fingerprint: string; nonce: string }>();
  return <Form action="Submit request" fields={form => {
    const row = requestSchema.parse({
      workspace: Number(value(form, "workspace")), agent: Number(value(form, "agent")), policy: Number(value(form, "policy")),
      category: value(form, "category"), vendor: value(form, "vendor"), product: value(form, "product"),
      amount: value(form, "amount"), purpose: value(form, "purpose"), evidence: value(form, "evidence"),
      explanation: value(form, "explanation"),
    });
    const fingerprint = JSON.stringify({ ...row, amount: row.amount.toString() });
    const next = submission?.fingerprint === fingerprint ? submission : { fingerprint, nonce: crypto.randomUUID() };
    if (next !== submission) setSubmission(next);
    return ["submit_request", [BigInt(row.workspace), BigInt(row.agent), BigInt(row.policy), row.category, row.vendor,
      row.product, row.amount, "USD", row.purpose, row.evidence, row.explanation, next.nonce]];
  }}>
    <div className="field-grid"><Field label="Workspace ID" name="workspace" type="number" defaultValue={workspaceId} />
      <Field label="Agent ID" name="agent" type="number" /><Field label="Active policy ID" name="policy" type="number" defaultValue={activePolicy ? String(activePolicy) : undefined} />
      <Field label="Action category" name="category"><select name="category">{categories.map(category => <option key={category}>{category}</option>)}</select></Field>
      <Field label="Vendor" name="vendor" max={100} /><Field label="Product or service" name="product" max={160} />
      <Field label="Amount (USD)" name="amount" /></div>
    <Area label="Business purpose" name="purpose" max={600} />
    <Field label="Public vendor evidence" name="evidence"><select name="evidence" required defaultValue=""><option value="" disabled>Select an approved page</option>
      {sources.map(source => <option key={source}>{source}</option>)}</select></Field>
    <Area label="Additional explanation (optional)" name="explanation" max={800} optional />
  </Form>;
}
