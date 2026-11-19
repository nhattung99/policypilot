"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Bot, Building2, ClipboardList, LayoutDashboard, Menu, ShieldCheck, Wallet } from "lucide-react";
import type { TransactionHash } from "genlayer-js/types";
import { contractAddress, injectedWallet, network, type Address } from "@/lib/genlayer/client";
import { getStats, type Arg } from "@/lib/genlayer/contracts";
import { inspectWrite, submitWrite } from "@/lib/genlayer/transactions";
import { Button } from "./ui/primitives";

type Job = { hash: TransactionHash; label: string; requestId?: number };
const key = `policypilot:${contractAddress}:latest-transaction`;
const nav = [
  ["/dashboard", "Overview", LayoutDashboard], ["/workspaces/new", "New workspace", Building2],
  ["/agents", "Agents", Bot], ["/policies", "Policies", BookOpen], ["/requests", "Requests", ClipboardList],
] as const;

type Session = { account?: Address; ready: boolean; busy: boolean; job?: Job; transactionState?: string;
  write: (method: string, args: Arg[], label: string, requestId?: number) => Promise<void> };
const Context = createContext<Session | undefined>(undefined);
export function useSession() {
  const session = useContext(Context);
  if (!session) throw new Error("Workspace session is missing.");
  return session;
}

export const message = (error: unknown) => error instanceof Error ? error.message : "Unexpected error";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 10000 } } }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [account, setAccount] = useState<Address>();
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState("");
  const [signing, setSigning] = useState(false);
  const [job, setJob] = useState<Job>();
  const queryClient = useQueryClient();
  const stats = useQuery({ queryKey: ["stats"], queryFn: getStats, enabled: !!contractAddress });
  useEffect(() => {
    const provider = injectedWallet();
    const update = (value: unknown) => {
      const candidate = Array.isArray(value) ? value[0] : undefined;
      setAccount(typeof candidate === "string" && /^0x[0-9a-f]{40}$/i.test(candidate)
        ? candidate.toLowerCase() as Address : undefined);
    };
    void provider?.request({ method: "eth_accounts" }).then(update).catch(() => {});
    provider?.on?.("accountsChanged", update);
    const loadSaved = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(key) ?? "null") as Job | null;
        if (saved && /^0x[0-9a-f]{64}$/i.test(saved.hash)) setJob(saved);
      } catch {
        // Browser storage is optional.
      }
    }, 0);
    return () => {
      window.clearTimeout(loadSaved);
      provider?.removeListener?.("accountsChanged", update);
    };
  }, []);
  const receipt = useQuery({
    queryKey: ["receipt", job?.hash],
    queryFn: () => inspectWrite(job!.hash),
    enabled: !!job, retry: false,
    refetchInterval: query => !query.state.data || query.state.data.state === "pending" ? 4000 : false,
  });
  const state = receipt.data?.state;
  useEffect(() => {
    if (state === "finalized" || state === "unverified") {
      void queryClient.invalidateQueries({ predicate: query => query.queryKey[0] !== "receipt" });
    }
  }, [state, queryClient]);
  async function connect() {
    setError("");
    try {
      const provider = injectedWallet();
      if (!provider) throw new Error("Install a browser wallet such as MetaMask.");
      const values = await provider.request({ method: "eth_requestAccounts" });
      const first = Array.isArray(values) ? values[0] : undefined;
      if (typeof first !== "string" || !/^0x[0-9a-f]{40}$/i.test(first)) throw new Error("Wallet did not return an account.");
      setAccount(first.toLowerCase() as Address);
    } catch (cause) { setError(message(cause)); }
  }

  function dismissTransaction() {
    setJob(undefined);
    try { localStorage.removeItem(key); } catch { /* optional */ }
  }

  const busy = signing || (!!job && (!state || state === "pending"));
  async function write(method: string, args: Arg[], label: string, requestId?: number) {
    if (busy || !account || !stats.isSuccess) throw new Error("Connect a wallet and wait for the contract and transaction status.");
    setSigning(true);
    setError("");
    try {
      const hash = await submitWrite(account, method, args);
      const next = { hash, label, requestId };
      setJob(next);
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* optional */ }
    } finally {
      setSigning(false);
    }
  }
  return <Context.Provider value={{ account, ready: !!contractAddress && stats.isSuccess && !!account,
    busy, job, transactionState: state, write }}>
    <div className="shell">
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <Link href="/" className="brand"><span className="brand-icon"><ShieldCheck size={22} /></span>PolicyPilot</Link>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Workspace">
          {nav.map(([href, label, Icon]) => {
            const active = path === href || (href !== "/workspaces/new" && path.startsWith(href + "/"));
            return <Link key={href} href={href} aria-current={active ? "page" : undefined} onClick={() => setMenu(false)}>
              <Icon size={18} />{label}</Link>;
          })}
        </nav>
        <Link className="sidebar-help" href="/how-it-works"><BookOpen size={16} /> How it works</Link>
      </aside>
      <div className="mainframe">
        <header className="toolbar">
          <Button className="mobile-toggle secondary" aria-label="Toggle navigation" aria-expanded={menu} onClick={() => setMenu(!menu)}><Menu size={20} /></Button>
          <span className="network"><i /> {network === "studionet" ? "Studionet" : "Invalid network configuration"}</span>
          <Button className="secondary wallet" onClick={connect}><Wallet size={16} />{account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "Connect wallet"}</Button>
        </header>
        <main className="content">
          {!contractAddress && <div className="notice"><strong>Contract deployment pending</strong><span>Forms can be previewed. On-chain actions become available once the Studionet address is configured.</span></div>}
          {contractAddress && stats.isError && <div className="notice danger" role="alert"><strong>Contract unavailable</strong><span>{message(stats.error)}</span></div>}
          {error && <p className="error" role="alert">{error}</p>}
          {job && <div role="status" className={state === "failed" ? "notice danger" : "notice"}>
            <strong>{job.label} · {state === "finalized" ? "Finalized" : state === "failed" ? "Transaction failed" : state === "unverified" ? "Finalized · Execution unverified" : "Awaiting finality"}</strong>
            <code>{job.hash}</code>
            <span>{receipt.isError ? "Receipt unavailable. Status checks will retry." : receipt.data?.status ?? "Submitted"}{receipt.data?.execution && ` · ${receipt.data.execution}`}</span>
            {["UNDETERMINED", "VALIDATORS_TIMEOUT", "LEADER_TIMEOUT"].includes(receipt.data?.status ?? "") &&
              <span>CONSENSUS_UNRESOLVED · No finalized policy verdict is inferred from this receipt.</span>}
            <div><Button className="secondary" onClick={dismissTransaction}>Stop tracking this transaction</Button></div>
            {job.requestId && <Link href={`/requests/${job.requestId}`}>View request #{job.requestId}</Link>}
          </div>}
          {children}
        </main>
      </div>
    </div>
  </Context.Provider>;
}
