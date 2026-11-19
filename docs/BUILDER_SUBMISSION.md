# Builder submission

**PolicyPilot — AI Policy Engine for Autonomous Businesses**

Businesses can express procurement policies in natural language alongside integer limits and explicit prohibitions. Agent operator wallets submit proposed purchases. GenLayer validators independently assess the public vendor evidence and interpret the frozen policy. The contract retains the adjudication and any administrator review for audit.

## NovaWorks AI walkthrough

Use two distinct test accounts. Create the NovaWorks AI workspace with the administrator wallet, then register the agent operator with `developer-tools`, `api-services`, and `gambling` scope for the demo. The agent scope lets the policy adjudicate the gambling request rather than reject it at submission.

Use an approval threshold of `10000`, currency `USD`, prohibited categories `["gambling", "personal"]`, and evidence types `["vendor-page", "business-purpose"]`. Create and activate version 1 with the following policy text.

> Standard developer tools and developer API services for a stated business purpose are permitted up to $100 per request when an official vendor page supports the requested category. Requests above $100 require human review. Gambling-related services and personal purchases are prohibited at any amount.

Use “Request human review when any policy exception or the relevance of the evidence is ambiguous” for the review rules.

| Request | Inputs | Expected under the policy |
| --- | --- | --- |
| A | GitHub Team, developer-tools, 2900 cents, developer collaboration, GitHub pricing | ALLOW if source and interpretation support it |
| B | A fictional gambling service, gambling, 2000 cents, entertainment, approved public reference | DENY from the declared structured prohibition, independent of the reference |
| C | OpenAI API, api-services, 25000 cents, product testing, OpenAI API pricing | REVIEW for human approval absent an established prohibition |

Submit with the operator wallet and a different nonce for each request. Evaluate after submission finalizes. For C, have the administrator approve or reject with a note. Verify that the original REVIEW remains intact. Capture the actual Studio transaction references and refresh the dashboard to show persisted state.


## Builder Portal submission draft

**Project:** PolicyPilot

**Tagline:** Every autonomous decision needs a rulebook.

**Short description:** PolicyPilot uses GenLayer validator consensus to evaluate autonomous procurement requests against versioned business policies and public vendor evidence.

**Technical description:** Workspace administrators register operator wallets and publish immutable policies. The Intelligent Contract checks authorization, currency, spending limits, and declared prohibited categories with deterministic code. For contextual judgments, GenVM retrieves approved public sources and validators independently assess the request under the comparative Equivalence Principle. Finalized decisions record the binding policy version, explanation, reasons, and evidence. Administrator review records a separate decision. The Next.js frontend reads finalized state through the official GenLayer JavaScript SDK.

**Network and contract:** GenLayer Studionet, `0x0a30EB7682cc39Fdc1f94fF2C571039b28EC435A`. [Studio Explorer](https://explorer-studio.genlayer.com/address/0x0a30EB7682cc39Fdc1f94fF2C571039b28EC435A)

**GitHub:** Pending approval to create and publish the public repository.

**Live app:** [PolicyPilot](https://policypilot-phi.vercel.app). The production dashboard was verified against finalized Studionet reads.

**Architecture:** See the [diagram in the README](../README.md#architecture). Use the NovaWorks AI walkthrough above for the three-verdict demo.

**Verification:** The deployed source and all 15 public method signatures were checked through the Studionet RPC. Finalized counters and recent decisions were readable. Live signing, consensus outcomes, and human review await the approved transaction run. See the [test plan](TESTING.md).

**Security limitations:** Vendor pages can change and models can disagree. The contract limits sources, requires grounded evidence for contextual approval, and leaves failed consensus without a finalized verdict. Public records are visible across workspaces. PolicyPilot does not execute purchases or transfer payments.

**Roadmap:** Index finalized receipts, expand approved evidence sources with verified redirect controls, and design expiring, single-use authorization for a future external executor.
