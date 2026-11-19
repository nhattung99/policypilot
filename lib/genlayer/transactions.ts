import { ExecutionResult, TransactionResult, TransactionStatus, type GenLayerTransaction, type TransactionHash } from "genlayer-js/types";
import { contractAddress, readClient, walletClient, type Address } from "./client";
import type { Arg } from "./contracts";

export async function submitWrite(account: Address, method: string, args: Arg[]) {
  if (!contractAddress) throw new Error("Contract deployment is pending.");
  const client = await walletClient(account);
  const schema = await readClient.getContractSchema(contractAddress);
  if (schema.methods?.[method]?.readonly !== false) throw new Error("The deployed contract is missing this write method.");
  return client.writeContract({ address: contractAddress, functionName: method, args, value: 0n });
}

export function assessReceipt(receipt: GenLayerTransaction) {
  const status = receipt.statusName ?? receipt.status;
  const receipts = receipt.consensus_data?.leader_receipt;
  const execution = (receipts?.find(entry => entry.mode === "leader") ?? receipts?.[0])?.execution_result ??
    receipt.txExecutionResultName;
  if (status === TransactionStatus.CANCELED || status === 8) {
    return { state: "failed" as const, status: "CANCELED", execution };
  }
  if (status !== TransactionStatus.FINALIZED && status !== 7) {
    return { state: "pending" as const, status: String(status ?? "Unknown"), execution };
  }
  const consensus = receipt.resultName ?? receipt.result;
  const accepted = consensus === TransactionResult.AGREE || consensus === TransactionResult.MAJORITY_AGREE ||
    consensus === 1 || consensus === 6;
  if (consensus !== undefined && !accepted) {
    return { state: "failed" as const, status: "FINALIZED", execution: "CONSENSUS_UNRESOLVED" };
  }
  if (accepted && (execution === ExecutionResult.FINISHED_WITH_RETURN || execution === "SUCCESS")) {
    return { state: "finalized" as const, status: "FINALIZED", execution };
  }
  if (execution === ExecutionResult.FINISHED_WITH_ERROR || execution === "ERROR") {
    return { state: "failed" as const, status: "FINALIZED", execution };
  }
  return { state: "unverified" as const, status: "FINALIZED", execution };
}

export async function inspectWrite(hash: TransactionHash) {
  return assessReceipt(await readClient.getTransaction({ hash }));
}
