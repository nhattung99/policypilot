# Contract interface

Class `PolicyPilot`. Constructor takes zero arguments. All IDs, timestamps, and monetary amounts use `u64`. Text, category, currency and evidence values use strings. String-list arguments are arrays of strings. All amounts are USD cents.

| Write | Arguments | Return |
| --- | --- | --- |
| create_workspace | name, description | workspace ID |
| register_agent | workspace_id, name, description, operator Address, categories | agent ID |
| update_agent_status | workspace_id, agent_id, active bool | void |
| create_policy | workspace_id, title, policy_text, currency, threshold, prohibited, evidence_types, review_rules, effective_at | policy ID |
| activate_policy | workspace_id, policy_id | void |
| submit_request | workspace_id, agent_id, policy_id, category, vendor, product, amount, currency, purpose, evidence_url, explanation, nonce | request ID |
| evaluate_request | request_id | void |
| review_request | request_id, approve bool, note | void |

Views return JSON strings unless otherwise stated.

| View | Arguments | Return |
| --- | --- | --- |
| get_stats | none | counters |
| get_workspace | workspace_id | workspace and active policy |
| get_agent | agent_id | operator and category scopes |
| get_policy | policy_id | immutable policy version |
| get_request | request_id | request, nullable verdict, nullable human review |
| list_recent_decisions | limit 1–10 | evaluated request IDs, newest first |
| list_workspace_requests | workspace_id, zero-based offset, limit 1–20 | array of request IDs |

Categories are `developer-tools`, `api-services`, `gambling`, `personal`, and `other`. Evidence types are `vendor-page` and `business-purpose`, both required. Use `effective_at=0` for immediate eligibility. Versions become active only through a separate activation write. Request nonces use a lowercase UUID-shaped string such as `00000000-0000-4000-8000-000000000001`. The same operator cannot submit the same nonce twice.
