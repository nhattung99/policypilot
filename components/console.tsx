"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, BookOpen, Bot, Building2, CheckCircle2, CircleX, ClipboardList, Clock3 } from "lucide-react";
import { contractAddress } from "@/lib/genlayer/client";
import { getRecentDecisions, getRecord, getStats, getWorkspaceRequests, newestIds, type Method, type RecordMap, type Arg } from "@/lib/genlayer/contracts";
import { id as idSchema, noteSchema, usd } from "@/lib/validation";
import { AgentForm, Field, PolicyForm, RequestForm, WorkspaceForm } from "./forms";
import { message, useSession } from "./shell";
import { Button, Card } from "./ui/primitives";

const dates = (unix: number) => unix ? new Date(unix * 1000).toISOString().replace("T", " ").slice(0, 19) + " UTC" : "Immediately";
const descriptors = [
  ["workspaces", "Active workspaces", Building2], ["agents", "Registered agents", Bot],
  ["active_policies", "Active policies", BookOpen], ["evaluated", "Evaluated requests", Activity],
  ["allow", "Allowed", CheckCircle2], ["deny", "Denied", CircleX], ["review", "Review verdicts", Clock3],
] as const;

function heading(title: string, copy: string, action?: [string, string]) {
  return <div className="page-heading"><div><h1>{title}</h1><p>{copy}</p></div>
    {action && <Link className="button" href={action[0]}>{action[1]}</Link>}</div>;
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="empty"><ClipboardList size={24} /><p>{children}</p></div>;
}

function ErrorBox({ error }: { error: unknown }) {
  return <div className="empty"><p className="error" role="alert">{message(error)}</p></div>;
}

function Pager({ page, more, change }: { page: number; more: boolean; change: (page: number) => void }) {
  if (!page && !more) return null;
  return <div className="pager"><Button className="secondary" onClick={() => change(page - 1)} disabled={!page}>Previous</Button>
    <span>Page {page + 1}</span><Button className="secondary" disabled={!more} onClick={() => change(page + 1)}>Next</Button></div>;
}

function useStats() {
  return useQuery({ queryKey: ["stats"], queryFn: getStats, enabled: !!contractAddress });
}

function Records<M extends Method>({ method, ids, render, empty = "No finalized records yet." }: {
  method: M; ids: number[]; render: (row: RecordMap[M], id: number) => ReactNode; empty?: string;
}) {
  const query = useQuery({
    queryKey: [method, "page", ...ids],
    queryFn: () => Promise.all(ids.map(async id => ({ id, data: await getRecord(method, id) }))),
    enabled: !!contractAddress && ids.length > 0,
  });
  if (!contractAddress) return <Empty>On-chain records will appear after deployment.</Empty>;
  if (!ids.length) return <Empty>{empty}</Empty>;
  if (query.isError) return <ErrorBox error={query.error} />;
  if (!query.data) return <Empty>Loading finalized records…</Empty>;
  return <div className="records">{query.data.map(({ id, data }) => <div className="record" key={id}>{render(data, id)}</div>)}</div>;
}

function List<M extends Method>({ method, count, render }: {
  method: M; count: number | undefined; render: (row: RecordMap[M], id: number) => ReactNode;
}) {
  const [page, setPage] = useState(0);
  if (contractAddress && count === undefined) return <Empty>Waiting for finalized contract state…</Empty>;
  return <><Records method={method} ids={newestIds(count ?? 0, page)} render={render} />
    <Pager page={page} more={(count ?? 0) > (page + 1) * 10} change={setPage} /></>;
}

function workspaceRow(row: RecordMap["get_workspace"], id: number) {
  return <><div><Link href={`/workspaces/${id}`}><strong>{row.name}</strong></Link><p>Workspace #{id} · {row.description}</p></div><span className="badge ALLOW">{row.status}</span></>;
}

function requestRow(row: RecordMap["get_request"], id: number) {
  return <><div><Link href={`/requests/${id}`}><strong>#{id} · {row.request.product}</strong></Link>
    <p>{row.request.vendor} · {row.request.agent_name} · Workspace #{row.request.workspace_id} · Policy v{row.request.policy_version}</p>
    {row.verdict && <p>{row.verdict.reason_codes.join(" · ")} · {row.review?.decision ?? "No human review recorded"} · Finalized state</p>}</div>
    <div className="row-end"><span>{usd(row.request.amount)}</span><span className={`badge ${row.verdict?.decision ?? ""}`}>{row.verdict?.decision ?? "SUBMITTED"}</span></div></>;
}

function Dashboard() {
  const stats = useStats();
  const recent = useQuery({ queryKey: ["recent-decisions"], queryFn: getRecentDecisions, enabled: stats.isSuccess });
  return <>{heading("Decision dashboard", "Monitor procurement requests, published policies, and finalized verdicts.", ["/workspaces/new", "Create workspace"])}
    <div className="stats">{descriptors.map(([key, label, Icon]) =>
      <Card key={key} className="stat"><span><Icon size={18} />{label}</span><strong>{stats.data?.[key] ?? "—"}</strong></Card>)}</div>
    <div className="dashboard-columns">
      <Card><div className="section-heading"><h2>Recent decisions</h2><Link href="/requests">View history</Link></div>
        {recent.isError ? <ErrorBox error={recent.error} /> : contractAddress && recent.isPending ?
          <Empty>Waiting for finalized decisions…</Empty> :
          <Records method="get_request" ids={recent.data ?? []} render={requestRow} empty="No finalized decisions yet." />}</Card>
      <Card><div className="section-heading"><h2>Workspaces</h2></div>
        <List method="get_workspace" count={stats.data?.workspaces} render={workspaceRow} /></Card>
    </div></>;
}

function ChainButton({ text, method, args, requestId, secondary }: {
  text: string; method: string; args: Arg[]; requestId?: number; secondary?: boolean;
}) {
  const { write, ready, busy } = useSession();
  const [error, setError] = useState("");
  return <div><Button className={secondary ? "secondary" : undefined} disabled={!ready || busy}
    onClick={() => { setError(""); void write(method, args, text, requestId).catch(cause => setError(message(cause))); }}>{text}</Button>
    {error && <p role="alert" className="error">{error}</p>}</div>;
}

function AgentRow({ row, id }: { row: RecordMap["get_agent"]; id: number }) {
  const { account } = useSession();
  const workspace = useQuery({ queryKey: ["get_workspace", row.workspace_id], queryFn: () => getRecord("get_workspace", row.workspace_id) });
  return <><div><strong>{row.name}</strong><p>Agent #{id} · Workspace #{row.workspace_id} · {row.categories.join(", ")}</p>
    <p>{row.description}</p><code>{row.operator}</code></div><div className="row-end">
      <span className={`badge ${row.active ? "ALLOW" : ""}`}>{row.active ? "ACTIVE" : "INACTIVE"}</span>
      {account && workspace.data?.administrator === account && <ChainButton secondary text={row.active ? "Deactivate" : "Reactivate"} method="update_agent_status"
        args={[BigInt(row.workspace_id), BigInt(id), !row.active]} />}</div></>;
}

function Agents() {
  const stats = useStats();
  return <>{heading("Agent registry", "Manage the operator wallets authorized to submit requests.")}
    <div className="dashboard-columns"><Card><h2>Registered agents</h2>
      <List method="get_agent" count={stats.data?.agents} render={(row, id) => <AgentRow row={row} id={id} />} /></Card>
      <AgentForm /></div></>;
}

function PolicyRow({ row, id }: { row: RecordMap["get_policy"]; id: number }) {
  const { account } = useSession();
  const workspace = useQuery({ queryKey: ["get_workspace", row.workspace_id], queryFn: () => getRecord("get_workspace", row.workspace_id) });
  const active = workspace.data?.active_policy_id === id;
  const superseded = (workspace.data?.active_policy_id ?? 0) > id;
  return <><div><strong>{row.title} · v{row.version}</strong>
    <p>Policy #{id} · Workspace #{row.workspace_id} · {usd(row.threshold)} limit · Effective {dates(row.effective_at)}</p>
    <details><summary>Read policy</summary><p>{row.text}</p><p>Review rules: {row.review_rules}</p>
      <p>Prohibited categories: {row.prohibited.join(", ") || "None declared"}</p><p>Evidence: {row.evidence_types.join(", ")}</p></details></div>
    <div className="row-end"><span className={`badge ${active ? "ALLOW" : ""}`}>{active ? "ACTIVE" : superseded ? "SUPERSEDED" : "DRAFT"}</span>
      {account && !active && !superseded && account === workspace.data?.administrator && <ChainButton secondary text="Activate policy" method="activate_policy" args={[BigInt(row.workspace_id), BigInt(id)]} />}</div></>;
}

function Policies() {
  const stats = useStats();
  return <>{heading("Policies", "Create and activate immutable policy versions for each workspace.", ["/policies/new", "New policy"])}
    <Card><h2>Policy versions</h2><List method="get_policy" count={stats.data?.policies} render={(row, id) => <PolicyRow row={row} id={id} />} /></Card></>;
}

function Requests() {
  const stats = useStats();
  return <>{heading("Action requests", "Browse finalized submissions and their evaluations.", ["/requests/new", "Submit request"])}
    <Card><h2>Request history</h2><List method="get_request" count={stats.data?.requests} render={requestRow} /></Card></>;
}

function WorkspaceDetail({ id }: { id: number }) {
  const [page, setPage] = useState(0);
  const query = useQuery({ queryKey: ["get_workspace", id], queryFn: () => getRecord("get_workspace", id), enabled: !!contractAddress });
  const requests = useQuery({ queryKey: ["workspace-requests", id, page], queryFn: () => getWorkspaceRequests(id, page * 20), enabled: query.isSuccess });
  const data = query.data;
  return <>{heading(data?.name ?? `Workspace #${id}`, data?.description ?? "Business workspace")}
    {query.isError ? <ErrorBox error={query.error} /> : !data ? <Empty>{contractAddress ? "Loading workspace…" : "Deployment is pending."}</Empty> :
      <><Card><div className="detail-grid">
        <Item name="Administrator"><code>{data.administrator}</code></Item><Item name="Status">{data.status}</Item>
        <Item name="Created">{dates(data.created_at)}</Item><Item name="Active policy">{data.active_policy_id ? `#${data.active_policy_id}` : "None"}</Item>
      </div><div className="actions"><Link href={`/policies/new?workspace=${id}`} className="button secondary">New policy</Link>
        <Link href={`/requests/new?workspace=${id}`} className="button secondary">Submit request</Link></div></Card>
      <Card><h2>Workspace requests</h2>{requests.isError ? <ErrorBox error={requests.error} /> : requests.isPending ? <Empty>Loading requests…</Empty> :
        <Records method="get_request" ids={requests.data ?? []} render={requestRow} />}
        <Pager page={page} more={data.request_count > (page + 1) * 20} change={setPage} /></Card></>}
  </>;
}

function Item({ name, children }: { name: string; children: ReactNode }) {
  return <div className="detail-item"><span>{name}</span><div>{children}</div></div>;
}

function ReviewForm({ id }: { id: number }) {
  const { write, busy, ready } = useSession();
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
    try {
      const note = noteSchema.parse(data.get("note"));
      const choice = data.get("review");
      if (choice !== "approve" && choice !== "reject") throw new Error("Choose approve or reject.");
      const approve = choice === "approve";
      setError("");
      await write("review_request", [BigInt(id), approve, note], "Record human review", id);
    } catch (cause) { setError(message(cause)); }
  }
  return <Card className="form-card"><h2>Administrator review</h2><form onSubmit={submit}>
    <Field label="Review note" name="note" max={600} />
    <div className="actions"><Button type="submit" name="review" value="approve" disabled={!ready || busy}>Approve request</Button>
      <Button className="secondary" type="submit" name="review" value="reject" disabled={!ready || busy}>Reject request</Button></div>
    {error && <p className="error" role="alert">{error}</p>}</form></Card>;
}

function RequestDetail({ id }: { id: number }) {
  const query = useQuery({ queryKey: ["get_request", id], queryFn: () => getRecord("get_request", id), enabled: !!contractAddress });
  const workspaceId = query.data?.request.workspace_id;
  const workspace = useQuery({ queryKey: ["get_workspace", workspaceId], queryFn: () => getRecord("get_workspace", workspaceId!), enabled: !!workspaceId });
  const { account, job, transactionState } = useSession();
  if (!query.data) return <>{heading(`Request #${id}`, "Evaluation detail")}
    {query.isError ? <ErrorBox error={query.error} /> : <Empty>{contractAddress ? "Loading finalized request…" : "Deployment is pending."}</Empty>}</>;
  const { request, verdict, review } = query.data;
  const isOwner = !!account && account === workspace.data?.administrator;
  const isOperator = !!account && account === request.operator;
  const related = job?.requestId === id;
  return <>{heading(`Request #${id} · ${request.product}`, `${request.vendor} · ${request.category}`)}
    <Card><h2>Submitted action</h2><div className="detail-grid">
      <Item name="Workspace"><Link href={`/workspaces/${request.workspace_id}`}>{workspace.data?.name ?? `#${request.workspace_id}`}</Link></Item>
      <Item name="Agent">{request.agent_name} · #{request.agent_id}<br/><code>{request.operator}</code></Item>
      <Item name="Frozen policy">Version {request.policy_version} · #{request.policy_id}</Item>
      <Item name="Amount">{usd(request.amount)}</Item><Item name="Submitted">{dates(request.submitted_at)}</Item>
      <Item name="Business purpose">{request.purpose}</Item>
      <Item name="Vendor source"><a href={request.evidence_url} target="_blank" rel="noreferrer">{request.evidence_url}</a></Item>
      {request.explanation && <Item name="Operator explanation">{request.explanation}</Item>}
    </div></Card>
    <Card><div className="section-heading"><h2>Policy verdict</h2>
      <span className={`badge ${verdict?.decision ?? ""}`}>{verdict?.decision ?? (related && transactionState === "pending" ? "EVALUATION PENDING" : "SUBMITTED")}</span></div>
      {verdict ? <div className="detail-grid">
        <Item name="Explanation">{verdict.summary}</Item><Item name="Reason codes">{verdict.reason_codes.join(", ")}</Item>
        <Item name="Policy clauses">{verdict.policy_clauses.join(" · ") || "No clause established"}</Item>
        <Item name="Evaluation transaction time">{dates(verdict.evaluated_at)}</Item>
        <Item name="Finality">Confirmed in the finalized contract state</Item>
        {verdict.evidence_quote && <Item name="Supporting excerpt">{verdict.evidence_quote}</Item>}
      </div> : <p>No finalized evaluation is recorded for this request.</p>}
      {related && <Item name="Tracked transaction"><code>{job.hash}</code></Item>}
      {!verdict && (isOwner || isOperator) && <ChainButton text="Evaluate request" method="evaluate_request" args={[BigInt(id)]} requestId={id} />}
    </Card>
    <Card><h2>Human review</h2>{review ? <div className="detail-grid"><Item name="Decision">{review.decision}</Item>
      <Item name="Reviewer"><code>{review.reviewer}</code></Item><Item name="Reviewed">{dates(review.reviewed_at)}</Item>
      <Item name="Note">{review.note}</Item></div> : <p>No human decision recorded.</p>}</Card>
    {verdict?.decision === "REVIEW" && !review && isOwner && !isOperator && <ReviewForm id={id} />}
  </>;
}

function NewVersionedForm({ kind }: { kind: "policy" | "request" }) {
  const workspace = idSchema.safeParse(Number(useSearchParams().get("workspace")));
  const query = useQuery({ queryKey: ["get_workspace", workspace.data], queryFn: () => getRecord("get_workspace", workspace.data!),
    enabled: workspace.success && !!contractAddress });
  const selected = workspace.success ? String(workspace.data) : undefined;
  return kind === "policy" ? <>{heading("New policy", "Define the policy that will govern future action requests.")}
    <PolicyForm workspaceId={selected} nextVersion={query.data && query.data.versions + 1} /></> :
    <>{heading("Submit request", "Submit an action as a registered agent operator.")}
      <RequestForm key={query.data?.active_policy_id ?? 0} workspaceId={selected} activePolicy={query.data?.active_policy_id} /></>;
}

export function ConsolePage({ segments }: { segments: string[] }) {
  const [section, entry] = segments;
  if (section === "dashboard") return <Dashboard />;
  if (section === "agents") return <Agents />;
  if (section === "policies") return entry === "new" ? <NewVersionedForm kind="policy" /> : <Policies />;
  if (section === "requests") return entry === "new" ? <NewVersionedForm kind="request" /> : entry ? <RequestDetail id={Number(entry)} /> : <Requests />;
  return entry === "new" ? <>{heading("Create workspace", "Establish a business workspace for policies and authorized agents.")}<WorkspaceForm /></> : <WorkspaceDetail id={Number(entry)} />;
}
