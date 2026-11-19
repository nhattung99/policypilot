"""Exercise real GenVM SDK storage and calldata with local web and LLM fixtures."""
import json
import os
from pathlib import Path
from unittest.mock import patch

from gltest.direct import loader, sdk_loader
from gltest.direct.vm import VMContext


def main():
    if cache := os.environ.get("POLICYPILOT_GENVM_CACHE"):
        sdk_loader.CACHE_DIR = Path(cache).resolve()
    path = Path(__file__).resolve().parents[1] / "contracts" / "policy_pilot.py"
    vm = VMContext()
    inject_message = loader._inject_message_to_fd0
    held_files = []

    def inject(context):
        try:
            inject_message(context)
        except PermissionError as error:
            # Windows keeps the temporary context file open through its duplicated stdin handle.
            if getattr(error, "winerror", None) != 32 or context._original_stdin_fd is None:
                raise
            held_files.append(Path(error.filename))

    try:
        with vm.activate(), patch.object(loader, "_inject_message_to_fd0", inject):
            contract = loader.deploy_contract(path, vm, sdk_version="v0.2.16")
            from genlayer import Address

            administrator = Address(bytes.fromhex("aa" * 20))
            operator = Address(bytes.fromhex("bb" * 20))
            vm.sender = administrator
            workspace = contract.create_workspace("NovaWorks AI", "SDK storage check")
            assert workspace == 1
            assert json.loads(contract.get_workspace(workspace))["administrator"] == str(administrator).lower()
            agent = contract.register_agent(workspace, "Buyer", "Procurement", operator, ["developer-tools"])
            policy = contract.create_policy(workspace, "Rules", "Developer tools are permitted.", "USD", 10000,
                                            [], ["vendor-page", "business-purpose"], "Review unclear evidence.", 0)
            contract.activate_policy(workspace, policy)

            vm.sender = operator
            evidence_url = "https://github.com/pricing"
            request = contract.submit_request(workspace, agent, policy, "developer-tools", "GitHub", "Team",
                                              25000, "USD", "Developer collaboration", evidence_url, "",
                                              "00000000-0000-4000-8000-000000000001")
            quote = "GitHub Team provides advanced collaboration and developer tools."
            vm.mock_web(r"https://github\.com/pricing", {"response": {
                "status": 200, "body": quote.encode(), "headers": {"content-type": b"text/plain"},
            }})
            vm.mock_llm("Adjudicate procurement", json.dumps({
                "decision": "ALLOW", "code": "POLICY_SATISFIED", "summary": "Vendor supports this use case.",
                "clauses": ["Developer tools are permitted."], "quote": quote,
            }))
            contract.evaluate_request(request)
            verdict = json.loads(contract.get_request(request))["verdict"]
            assert verdict["decision"] == "REVIEW"
            assert verdict["reason_codes"] == ["HUMAN_APPROVAL_REQUIRED"]
            assert verdict["evidence_quote"] == quote

            vm.sender = administrator
            contract.review_request(request, True, "Approve developer collaboration")
            reviewed = json.loads(contract.get_request(request))
            assert reviewed["review"]["decision"] == "HUMAN_APPROVED"
            assert reviewed["verdict"] == verdict
            assert contract.list_recent_decisions(5) == [request]
    finally:
        for held_file in held_files:
            held_file.unlink(missing_ok=True)

    print("Pinned SDK storage, calldata, mock evidence and model, and administrator review passed.")


if __name__ == "__main__":
    main()
