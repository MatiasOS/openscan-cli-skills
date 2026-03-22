import type { ContractInfo, PrestateAccountState, PrestateTrace } from "../types/domain";
import type { AddressStateChange, StorageSlotChange } from "../types/entries";

export function formatHexBalance(hex: string | undefined): string {
  if (!hex) return "—";
  try {
    const bn = BigInt(hex);
    const eth = Number(bn) / 1e18;
    return eth.toFixed(6);
  } catch {
    return hex;
  }
}

export function balanceDiff(pre?: string, post?: string): string | null {
  if (pre === undefined && post === undefined) return null;
  if (pre === post) return null;

  try {
    const preBn = BigInt(pre ?? "0x0");
    const postBn = BigInt(post ?? "0x0");
    const diff = postBn - preBn;
    const sign = diff >= 0n ? "+" : "";
    const eth = Number(diff) / 1e18;
    return `${sign}${eth.toFixed(6)}`;
  } catch {
    return null;
  }
}

function getStorageChanges(pre: PrestateAccountState, post: PrestateAccountState): StorageSlotChange[] {
  const storageKeys = Array.from(
    new Set([...Object.keys(pre.storage ?? {}), ...Object.keys(post.storage ?? {})]),
  ).filter((key) => pre.storage?.[key] !== post.storage?.[key]);

  return storageKeys.map((slot) => ({
    slot,
    before: pre.storage?.[slot] ?? "0x0",
    after: post.storage?.[slot] ?? "0x0",
  }));
}

export function collectStateChanges(
  trace: PrestateTrace,
  contracts: Record<string, ContractInfo> = {},
): AddressStateChange[] {
  const allAddresses = Array.from(new Set([...Object.keys(trace.pre), ...Object.keys(trace.post)]));

  const changedAddresses = allAddresses.filter((address) => {
    const pre: PrestateAccountState = trace.pre[address] ?? {};
    const post: PrestateAccountState = trace.post[address] ?? {};
    const bal = balanceDiff(pre.balance, post.balance);
    const nonceChanged = pre.nonce !== post.nonce && (pre.nonce !== undefined || post.nonce !== undefined);
    const codeChanged = pre.code !== post.code;
    const storageChanged = getStorageChanges(pre, post).length > 0;

    return !!(bal || nonceChanged || codeChanged || storageChanged);
  });

  return changedAddresses
    .sort((a, b) => a.localeCompare(b))
    .map((address) => {
      const pre: PrestateAccountState = trace.pre[address] ?? {};
      const post: PrestateAccountState = trace.post[address] ?? {};

      const bal = balanceDiff(pre.balance, post.balance);
      const nonceChanged = pre.nonce !== post.nonce && (pre.nonce !== undefined || post.nonce !== undefined);
      const codeChanged = pre.code !== post.code;
      const storage = getStorageChanges(pre, post);

      return {
        address,
        contractName: contracts[address.toLowerCase()]?.name,
        balance: bal
          ? {
              before: formatHexBalance(pre.balance),
              after: formatHexBalance(post.balance),
              diff: bal,
            }
          : null,
        nonce: nonceChanged
          ? {
              before: pre.nonce ?? null,
              after: post.nonce ?? null,
              diff: (post.nonce ?? 0) - (pre.nonce ?? 0),
            }
          : null,
        code: codeChanged
          ? {
              before: pre.code ?? null,
              after: post.code ?? null,
              changed: true,
            }
          : null,
        storage,
      };
    });
}
