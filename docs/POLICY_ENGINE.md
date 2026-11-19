# Policy engine

A submission requires a workspace, authorized active operator wallet, scoped action category, matching active policy ID, supported USD currency, positive integer cents, nonempty purpose, and an approved evidence URL. The accepted request pins the policy version. A subsequent supersession or operator deactivation does not change an already submitted request.

Declared structured prohibitions create a deterministic DENY. For other requests each GenLayer evaluator retrieves the fixed vendor URL using `gl.nondet.web.get` and evaluates policy, request, and bounded readable evidence via `gl.nondet.exec_prompt` with JSON output. The output must have a known verdict and reason, limited text, actual policy excerpts, and a supporting quote found in the retrieved source for ALLOW or contextual DENY. `gl.eq_principle.prompt_comparative` instructs validators to compare decisions, exact clauses and codes, substantive reasons, and evidence. Disagreement can prevent an evaluation transaction from finalizing successfully.

The structured spending threshold is compared using cents before adjudication. An above-threshold request receives HUMAN_APPROVAL_REQUIRED alongside any unresolved evidence codes unless a violation establishes DENY. An over-limit decision cannot finalize as ALLOW. There is no currency conversion.

| Verdict | Meaning |
| --- | --- |
| ALLOW | Evaluators found the request consistent with the policy and supported by public evidence. |
| DENY | A declared or contextual prohibition is established. |
| REVIEW | Human judgment or better evidence is required. |
| Unevaluated | Submission exists without a successful finalized verdict. |

`CONSENSUS_UNRESOLVED` is a transaction diagnostic. It is not a verdict reason recorded on-chain by a failed write. Administrator decisions can approve or reject a REVIEW and cannot change the policy verdict.
