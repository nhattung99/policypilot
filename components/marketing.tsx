import Link from "next/link";
import { BookOpen, Fingerprint, GitFork, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/primitives";

const stages = [
  { icon: BookOpen, title: "Publish a policy", copy: "Write your policy in plain language and set spending limits, prohibited categories, and evidence requirements." },
  { icon: GitFork, title: "Evaluate an action", copy: "An authorized operator submits a request. GenLayer validators independently assess public evidence against the frozen policy." },
  { icon: Fingerprint, title: "Trace the decision", copy: "Read finalized verdicts, policy clauses, and any administrator review in the on-chain decision history." },
];

export function Marketing({ explain = false }: { explain?: boolean }) {
  return <div className="marketing">
    <header className="marketing-header">
      <Link href="/" className="brand"><span className="brand-icon"><ShieldCheck size={22} /></span>PolicyPilot</Link>
      <nav aria-label="Main"><Link href="/how-it-works">How it works</Link><Link href="/dashboard" className="button secondary">Open dashboard</Link></nav>
    </header>
    <main className="marketing-main">
      <section className="hero">
        <div>
          <p className="eyebrow">AI POLICY ENGINE · GENLAYER</p>
          <h1>{explain ? "From policy to verifiable decision." : "Every autonomous decision needs a rulebook."}</h1>
          <p className="lede">{explain ? "PolicyPilot binds each procurement request to an immutable policy version and records the outcome on GenLayer." :
            "Set the rules for autonomous procurement. Evaluate agent requests against public evidence and keep a verifiable record of each decision."}</p>
          <div className="actions"><Link href="/dashboard" className="button">Open dashboard</Link>{!explain && <Link href="/how-it-works" className="button secondary">How it works</Link>}</div>
        </div>
        <Card className="hero-panel">
          <span className="brand-icon"><ShieldCheck size={28} /></span>
          <h2>Policy evaluation</h2>
          <div><span className="badge ALLOW">ALLOW</span><span>Policy and evidence support the request</span></div>
          <div><span className="badge DENY">DENY</span><span>An established rule prohibits the request</span></div>
          <div><span className="badge REVIEW">REVIEW</span><span>Human review or better evidence is required</span></div>
          <p>Verdicts record policy decisions. Purchases and payments happen outside PolicyPilot.</p>
        </Card>
      </section>
      <section className="stage-grid" aria-label="Policy workflow">{stages.map(({ icon: Icon, title, copy }) =>
        <Card key={title}><Icon size={24} className="accent" /><h2>{title}</h2><p>{copy}</p></Card>)}</section>
      {explain && <Card className="explainer"><h2>What gets checked</h2><p>Wallet authorization, currency, policy version, declared prohibited categories, and spending thresholds use deterministic checks. Vendor category, business purpose, contradictions, and exceptions require contextual assessment. If an evaluation transaction fails, its status stays separate from the request’s policy verdict.</p></Card>}
    </main>
  </div>;
}
