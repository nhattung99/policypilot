# Tests

`npm test` runs TypeScript validation, receipt classification, and page-boundary tests plus Python contract behavior tests. The Python unit suite injects local SDK, evidence and model test doubles. Those tests cover roles, version pinning and immutability, input checks, replay, workflow transitions, missing sources, corrupted model output, conflicting evidence, duplicate operations, consensus failure behavior, and audit pagination. Test doubles exist only in tests.

`npm run test:browser` starts a local Next.js test server and checks required routes, disconnected and connected wallet presentation, missing deployment, form validation, responsive navigation, and error states. Use `POLICYPILOT_BROWSER` to select an installed Playwright browser channel. Connected-wallet tests use an injected harness.

## Live Studionet acceptance

Execute after manual deployment. Record observed hashes, protocol status and execution result in Studio and compare with the app.

1. Connect the administrator wallet to Studionet using the SDK-supported MetaMask and Snap flow.
2. Create NovaWorks AI. Confirm that a disconnected wallet cannot submit and that a second wallet cannot administer the first workspace.
3. Register a separate operator, create the demo policy and activate it. Inspect the generated interface and finalized contract state between writes.
4. Switch to the operator wallet. Submit scenarios A, B and C with distinct nonces. Confirm unauthorized wallet, stale policy ID, invalid evidence URL, and nonce reuse are rejected.
5. Open each finalized submission. Send its evaluation write from the operator. Check the receipt during consensus and again after finalization. Verify that failed or unresolved evaluation does not create a verdict.
6. Inspect the actual decision, reason codes, excerpts, and evaluation time. Recheck external source availability and validator logs if the result differs from the scenario expectation. A successful Studio validator run is the authoritative retrieval test.
7. Review C as the administrator when the finalized result is REVIEW. Verify the separate reviewer, note, decision, and timestamp. Attempt duplicate approval and an unauthorized review.
8. Refresh from a fresh browser session. Confirm on-chain state, history, counts and pagination persist. In the submitting browser, verify the latest tracked receipt continues across reload.
9. Activate v2 with a different limit and check that v1 requests remain pinned. Deactivate the operator and check that new submissions are rejected.

Live wallet signing, consensus outcomes, and persistence of written state require the approved Studionet transaction run. Finalized reads can be verified before that run.

## Read-only integration

Set `NEXT_PUBLIC_GENLAYER_NETWORK=studionet` and `NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS` in `.env.local`. Run `npm run test:integration`. The check compares the deployed source and ABI with the checkout and reads finalized counters and decision history using the official SDK.

To exercise the real RPC from the local dashboard, export `POLICYPILOT_BROWSER_LIVE=1` and the same contract address as `NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS` in the shell, then run `npm run build` and `npm run test:browser`. The browser test starts the production build, inspects finalized RPC data, checks the dashboard counters on initial load and refresh, and tests mobile navigation. It sends no transactions.

## Official runner validation

Install `genvm-linter==0.11.0` in a Python virtual environment. Set `GENVM_VERSION=v0.2.16` to use the matching runner bundle. Run `genvm-lint check contracts/policy_pilot.py` and `genvm-lint schema contracts/policy_pilot.py --json`. Both checks run against a local SDK extracted from GenLayer Labs' public runner bundle. The source remains local.

To run the configured browser fixture, set `POLICYPILOT_BROWSER_CONFIGURED=1` and run `npm run test:browser` again. It intercepts Studionet RPC in the test browser to exercise finalized records, counts, the administrator review form, and RPC failures.

The optional pinned-SDK smoke test runs with `genlayer-test==0.29.2` via `python tests/direct_sdk.py`. It exercises real storage and ABI-backed calldata with mocked web and model responses in GenLayer Direct Mode. Set `POLICYPILOT_GENVM_CACHE` to reuse a compatible runner bundle. This check does not exercise network consensus.

## Release verification on November 19, 2026

| Check | Observed result |
| --- | --- |
| Studionet RPC | The deployed source matched the checkout after line-ending normalization. All 15 method signatures matched. Finalized counters were zero and recent decision history was empty. |
| Local checks | TypeScript, ESLint, production build, 6 TypeScript tests, 23 contract behavior tests, and the pinned GenVM SDK smoke test passed. Contract tests used fixtures for external evidence and model responses. |
| Browser | Six fixture-based tests passed. The real Studionet dashboard test passed against the local production build, including refresh and mobile navigation. A preliminary run on the development server was interrupted by hot reload. |
| Live writes | Pending transaction approval and two authorized Studionet signing wallets. The contract had no persisted test records during verification. |
| Production site | [Vercel production](https://policypilot-phi.vercel.app) returned HTTP 200. The browser verified the landing page, real Studionet counters before and after refresh, mobile navigation, and missing-wallet feedback. |
