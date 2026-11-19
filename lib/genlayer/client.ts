import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
type Provider = NonNullable<NonNullable<Parameters<typeof createClient>[0]>["provider"]>;

export type Address = `0x${string}`;
export const network = process.env.NEXT_PUBLIC_GENLAYER_NETWORK ?? "studionet";
const configured = process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS?.trim();
export const contractAddress = network === "studionet" && configured &&
  /^0x[0-9a-f]{40}$/i.test(configured) && !/^0x0{40}$/.test(configured)
  ? configured as Address : undefined;
export const readClient = createClient({ chain: studionet });

export function injectedWallet() {
  return (window as Window & { ethereum?: Provider }).ethereum;
}

export async function walletClient(address: Address) {
  const provider = injectedWallet();
  if (!provider) throw new Error("Install an EIP-1193 browser wallet to continue.");
  const client = createClient({ chain: studionet, account: address, provider });
  await client.connect("studionet");
  const [chainId, accounts] = await Promise.all([
    provider.request({ method: "eth_chainId" }),
    provider.request({ method: "eth_accounts" }),
  ]);
  if (typeof chainId !== "string" || Number(chainId) !== studionet.id) {
    throw new Error("Switch your wallet to Studionet.");
  }
  if (!Array.isArray(accounts) || typeof accounts[0] !== "string" ||
      accounts[0].toLowerCase() !== address.toLowerCase()) {
    throw new Error("The active wallet account changed. Select it and try again.");
  }
  return client;
}
