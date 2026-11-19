# Architecture

Next.js renders the public landing and explanation pages and the responsive console. The browser uses TanStack Query for bounded finalized-state reads. Wallet writes use the official GenLayer JavaScript SDK with the bundled Studionet chain definition. There is no application server, database, wallet custody, or independent LLM authority.

A single contract stores workspaces, registered agents, immutable policy versions, immutable requests, separate verdicts, and separate human reviews in TreeMaps. Records are bounded JSON strings. Public IDs are global one-based counters. Workspace policy versions increment independently. Only one version per workspace is active for new submissions. Workspace request queries read at most 20 indexed IDs. Global lists retrieve IDs in pages of 10, and dashboard counters require a single view call.

A successful submission creates SUBMITTED state. EVALUATION_PENDING is a client receipt state while the evaluation write is underway. Failed or unresolved consensus leaves the persisted request unevaluated. A successful finalized evaluation creates ALLOW, DENY, or REVIEW. A later human decision is stored separately. Finalized-state views carry the deterministic transaction execution times for submission, evaluation, and review. Exact consensus finalization time and a cross-device transaction index are not exposed by this app. The browser retains the latest submitted hash for its configured deployment, and Studio Explorer provides the protocol transaction timeline.

## Versions

Use the stable hosted Studionet, network ID 61999, sourced from the bundled SDK and verified by a read-only chain ID call. The application locks genlayer-js to 1.1.8. Its connect helper uses MetaMask Snap APIs, and the SDK's provider transport handles the wallet handoff. The contract runner hash is pinned to the official First Intelligent Contract example. Stable Studionet is distinct from the preview SDK and network. See [Studio](https://docs.genlayer.com/developers/intelligent-contracts/tools/genlayer-studio), [JS SDK source](https://github.com/genlayerlabs/genlayer-js/tree/v1.1.8), and [contract example](https://docs.genlayer.com/developers/intelligent-contracts/first-intelligent-contract).
The pinned runtime was validated locally against the GenVM v0.2.16 release bundle. Its exact runner ABI is the basis of the contract interface guide.
