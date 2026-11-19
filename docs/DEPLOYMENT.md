# Manual Studionet deployment

1. Open [GenLayer Studio](https://studio.genlayer.com/) on stable Studionet. Select an administrator test account and use the faucet if needed.
2. Open **Contracts**, choose **New Contract**, then choose **Add From File** and select [contracts/policy_pilot.py](../contracts/policy_pilot.py). Open the uploaded contract.
3. Open **Run and Debug**. Check that Studio detects class `PolicyPilot` with no **Constructor Inputs**. Keep the pinned runner directive. Resolve any schema error before submitting. The expected methods are in [CONTRACT_INTERFACE.md](CONTRACT_INTERFACE.md).
4. Click **Deploy** using ordinary validator consensus and wait for successful finalization. Copy the value labeled **Contract Address**.
5. Under **Read Methods**, call `get_stats` and confirm all counters are zero. Under **Write Methods**, run `create_workspace` with a name and description. Wait for finalization, then call `get_workspace(1)` and confirm the administrator matches the selected signing account.
6. Use the appropriate test wallet for each action in the [Studionet test plan](TESTING.md). Send the contract address for final frontend integration and verification.

See the official [loading](https://docs.genlayer.com/developers/intelligent-contracts/tools/genlayer-studio/loading-contract), [deployment](https://docs.genlayer.com/developers/intelligent-contracts/tools/genlayer-studio/deploying-contract), and [transaction](https://docs.genlayer.com/developers/intelligent-contracts/tools/genlayer-studio/execute-transaction) guides.
