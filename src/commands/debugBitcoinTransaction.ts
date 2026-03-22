import type { OpenScanClient } from "../client";
import { getNetworkInfo } from "../metadata";
import type {
  BtcTxDebugResult,
  BtcTxInput,
  BtcTxOutput,
  BtcAddressInfo,
  BtcBlockInclusion,
  BtcMempoolDetails,
  BtcFeeAnalysis,
} from "../types";

const TXID_RE = /^[0-9a-fA-F]{64}$/;
const MAX_UTXO_CHECKS = 50;

function normalizeTxid(raw: string): string {
  return raw.startsWith("0x") ? raw.slice(2) : raw;
}

function interpretLocktime(locktime: number): string {
  if (locktime === 0) return "no locktime";
  if (locktime < 500_000_000) return `block height ${locktime.toLocaleString()}`;
  return `unix timestamp ${new Date(locktime * 1000).toISOString()}`;
}

function classifyAddressType(scriptType: string | undefined): string | null {
  switch (scriptType) {
    case "pubkeyhash": return "legacy";
    case "scripthash": return "p2sh";
    case "witness_v0_keyhash": return "segwit";
    case "witness_v0_scripthash": return "segwit";
    case "witness_v1_taproot": return "taproot";
    default: return scriptType ?? null;
  }
}

function classifyTransactionType(outputs: BtcTxOutput[], isCoinbase: boolean): string {
  if (isCoinbase) return "Coinbase";

  const types = outputs.map(o => o.scriptType);
  const hasOpReturn = types.includes("nulldata");
  const nonOpReturnTypes = types.filter(t => t !== "nulldata");

  const uniqueTypes = [...new Set(nonOpReturnTypes)];

  const typeLabel = (t: string): string => {
    switch (t) {
      case "pubkeyhash": return "P2PKH";
      case "scripthash": return "P2SH";
      case "witness_v0_keyhash": return "P2WPKH";
      case "witness_v0_scripthash": return "P2WSH";
      case "witness_v1_taproot": return "P2TR";
      case "multisig": return "Multisig";
      case "nonstandard": return "Nonstandard";
      default: return t;
    }
  };

  if (uniqueTypes.length === 0 && hasOpReturn) return "OP_RETURN data";
  const dominant = uniqueTypes.length === 1 ? typeLabel(uniqueTypes[0]!) : "Mixed";
  const suffix = hasOpReturn ? " + OP_RETURN" : "";
  return `${dominant} transfer${suffix}`;
}

function assessFee(
  feeRate: number | null,
  fastRate: number | null,
  slowRate: number | null,
): string | null {
  if (feeRate == null || (fastRate == null && slowRate == null)) return null;

  // Convert BTC/kB to sat/vB: 1 BTC/kB = 100_000 sat/vB
  const toSatVb = (btcKb: number) => btcKb * 100_000;

  if (fastRate != null && feeRate > toSatVb(fastRate) * 2) return "overpaying";
  if (fastRate != null && feeRate >= toSatVb(fastRate) * 0.8) return "reasonable (fast)";
  if (slowRate != null && feeRate >= toSatVb(slowRate) * 0.8) return "reasonable";
  if (slowRate != null && feeRate < toSatVb(slowRate) * 0.5) return "very low";
  return "underpaying";
}

export async function debugBitcoinTransaction(
  client: OpenScanClient,
  networkId: string,
  rawTxid: string,
): Promise<BtcTxDebugResult> {
  const txid = normalizeTxid(rawTxid);

  if (!TXID_RE.test(txid)) {
    throw new Error(`Invalid Bitcoin txid: "${rawTxid}". Must be a 64-character hex string.`);
  }

  const rpcClient = client.getClient(networkId);

  // Phase 1: Primary parallel fetch
  const [txRes, blockchainInfoRes, feesFast, feesMedium, feesSlow] = await Promise.all([
    rpcClient.getRawTransaction(txid, 2),
    rpcClient.getBlockchainInfo().catch(() => null),
    rpcClient.estimateSmartFee(2).catch(() => null),
    rpcClient.estimateSmartFee(6).catch(() => null),
    rpcClient.estimateSmartFee(24).catch(() => null),
  ]);

  if (!txRes.data) {
    throw new Error(`Transaction not found: ${txid}`);
  }

  const tx = txRes.data;
  const isCoinbase = tx.vin?.length === 1 && tx.vin[0].coinbase != null;
  const isConfirmed = !!tx.blockhash;
  const isSegWit = tx.vin?.some((v: any) => v.txinwitness && v.txinwitness.length > 0) ?? false;
  const isRBF = tx.vin?.some((v: any) => v.sequence < 0xfffffffe) ?? false;

  // Phase 2: Conditional fetches
  let blockInclusion: BtcBlockInclusion | null = null;
  let mempoolDetails: BtcMempoolDetails | null = null;

  if (isConfirmed && tx.blockhash) {
    const [blockRes, blockStatsRes] = await Promise.all([
      rpcClient.getBlock(tx.blockhash, 1).catch(() => null),
      rpcClient.getBlockStats(tx.blockhash).catch(() => null),
    ]);

    const block = blockRes?.data;
    const positionInBlock = block?.tx?.indexOf(txid) ?? null;

    blockInclusion = {
      isConfirmed: true,
      blockhash: tx.blockhash,
      blockHeight: block?.height ?? tx.blockheight ?? null,
      blockTime: tx.blocktime ? new Date(tx.blocktime * 1000).toISOString() : (block?.time ? new Date(block.time * 1000).toISOString() : null),
      confirmations: tx.confirmations ?? null,
      positionInBlock: positionInBlock != null && positionInBlock >= 0 ? positionInBlock : null,
      blockTxCount: block?.nTx ?? null,
      blockSize: block?.size ?? null,
      blockWeight: block?.weight ?? null,
    };
  } else {
    const [mempoolEntryRes, mempoolAncestorsRes, mempoolDescendantsRes] = await Promise.all([
      rpcClient.getMempoolEntry(txid).catch(() => null),
      rpcClient.getMempoolAncestors(txid, true).catch(() => null),
      rpcClient.getMempoolDescendants(txid, true).catch(() => null),
    ]);

    const entry = mempoolEntryRes?.data;
    mempoolDetails = {
      isInMempool: !!entry,
      entry: entry
        ? {
            vsize: entry.vsize,
            weight: entry.weight,
            fees: {
              base: entry.fees?.base ?? 0,
              modified: entry.fees?.modified ?? 0,
              ancestor: entry.fees?.ancestor ?? 0,
              descendant: entry.fees?.descendant ?? 0,
            },
            time: entry.time ? new Date(entry.time * 1000).toISOString() : new Date().toISOString(),
            height: entry.height ?? 0,
            ancestorCount: entry.ancestorcount ?? 0,
            ancestorSize: entry.ancestorsize ?? 0,
            descendantCount: entry.descendantcount ?? 0,
            descendantSize: entry.descendantsize ?? 0,
            depends: entry.depends ?? [],
            spentby: entry.spentby ?? [],
          }
        : null,
      ancestors: mempoolAncestorsRes?.data ?? null,
      descendants: mempoolDescendantsRes?.data ?? null,
    };
  }

  // Phase 3: UTXO checks, script decoding, address validation
  const outputsToCheck = tx.vout?.slice(0, MAX_UTXO_CHECKS) ?? [];
  const utxoResults = await Promise.all(
    outputsToCheck.map((out: any, i: number) =>
      rpcClient.getTxOut(txid, i, true).catch(() => null)
    ),
  );

  // Collect all unique addresses
  const addressMap = new Map<string, { roles: Set<string>; scriptType?: string }>();
  for (const vin of tx.vin ?? []) {
    const addr = vin.prevout?.scriptPubKey?.address;
    if (addr) {
      const existing = addressMap.get(addr);
      if (existing) {
        existing.roles.add("input");
      } else {
        addressMap.set(addr, { roles: new Set(["input"]), scriptType: vin.prevout?.scriptPubKey?.type });
      }
    }
  }
  for (const vout of tx.vout ?? []) {
    const addr = vout.scriptPubKey?.address;
    if (addr) {
      const existing = addressMap.get(addr);
      if (existing) {
        existing.roles.add("output");
      } else {
        addressMap.set(addr, { roles: new Set(["output"]), scriptType: vout.scriptPubKey?.type });
      }
    }
  }

  const addressEntries = [...addressMap.entries()];
  const validationResults = await Promise.all(
    addressEntries.map(([addr]) =>
      rpcClient.validateAddress(addr).catch(() => null)
    ),
  );

  const addresses: BtcAddressInfo[] = addressEntries.map(([addr, info], i) => {
    const validation = validationResults[i]?.data;
    const roles = info.roles;
    const role: "input" | "output" | "both" =
      roles.has("input") && roles.has("output") ? "both" :
      roles.has("input") ? "input" : "output";

    return {
      address: addr,
      isValid: validation?.isvalid ?? true,
      type: classifyAddressType(info.scriptType),
      witnessVersion: validation?.witness_version ?? null,
      role,
    };
  });

  // Decode scripts for inputs/outputs
  const inputScriptHexes = (tx.vin ?? [])
    .filter((v: any) => v.scriptSig?.hex)
    .map((v: any) => v.scriptSig.hex);
  const outputScriptHexes = (tx.vout ?? [])
    .map((v: any) => v.scriptPubKey?.hex)
    .filter(Boolean);

  const allScriptHexes = [...inputScriptHexes, ...outputScriptHexes];
  const scriptDecodeResults = await Promise.all(
    allScriptHexes.map(hex => rpcClient.decodeScript(hex).catch(() => null))
  );

  // Build decoded script map for reference
  const decodedScripts = new Map<string, any>();
  allScriptHexes.forEach((hex, i) => {
    if (scriptDecodeResults[i]?.data) {
      decodedScripts.set(hex, scriptDecodeResults[i].data);
    }
  });

  // Build inputs
  const inputs: BtcTxInput[] = (tx.vin ?? []).map((vin: any, i: number) => ({
    index: i,
    prevTxid: vin.txid ?? null,
    prevVout: vin.vout ?? null,
    value: vin.prevout?.value ?? null,
    address: vin.prevout?.scriptPubKey?.address ?? null,
    scriptSig: vin.scriptSig ? { asm: vin.scriptSig.asm, hex: vin.scriptSig.hex } : null,
    witness: vin.txinwitness ?? null,
    sequence: vin.sequence,
    sequenceHex: `0x${(vin.sequence >>> 0).toString(16).padStart(8, "0")}`,
    scriptType: vin.prevout?.scriptPubKey?.type ?? null,
    coinbase: vin.coinbase ?? null,
  }));

  // Build outputs
  const outputs: BtcTxOutput[] = (tx.vout ?? []).map((vout: any, i: number) => ({
    index: i,
    value: vout.value,
    address: vout.scriptPubKey?.address ?? null,
    scriptPubKey: {
      asm: vout.scriptPubKey?.asm ?? "",
      hex: vout.scriptPubKey?.hex ?? "",
      type: vout.scriptPubKey?.type ?? "unknown",
      desc: vout.scriptPubKey?.desc,
    },
    scriptType: vout.scriptPubKey?.type ?? "unknown",
    isSpent: i < utxoResults.length ? (utxoResults[i]?.data == null) : null,
  }));

  // Fee analysis
  const totalOutputValue = outputs.reduce((sum, o) => sum + o.value, 0);
  let totalInputValue: number | null = null;
  let fee: number | null = null;
  let feeSats: number | null = null;
  let feeRate: number | null = null;

  if (!isCoinbase) {
    const inputValues = inputs.map(i => i.value);
    if (inputValues.every(v => v != null)) {
      totalInputValue = inputValues.reduce((sum, v) => sum + v!, 0);
      fee = parseFloat((totalInputValue - totalOutputValue).toFixed(8));
      feeSats = Math.round(fee * 1e8);
      if (tx.vsize > 0) {
        feeRate = parseFloat((feeSats / tx.vsize).toFixed(2));
      }
    }
  }

  const fastRate = feesFast?.data?.feerate ?? null;
  const mediumRate = feesMedium?.data?.feerate ?? null;
  const slowRate = feesSlow?.data?.feerate ?? null;

  const feeAnalysis: BtcFeeAnalysis = {
    totalInputValue,
    totalOutputValue,
    fee,
    feeSats,
    feeRate,
    currentFeeEstimates: {
      fast: { feeRate: fastRate, blocks: 2 },
      medium: { feeRate: mediumRate, blocks: 6 },
      slow: { feeRate: slowRate, blocks: 24 },
    },
    feeAssessment: assessFee(feeRate, fastRate, slowRate),
  };

  const transactionTypeClassification = classifyTransactionType(outputs, isCoinbase);

  const networkInfo = await getNetworkInfo(networkId);
  const isTestnet = networkId.includes("testnet") || networkId.includes("signet");
  const explorerBase = isTestnet ? "https://mempool.space/testnet4" : "https://mempool.space";

  return {
    networkId,
    networkName: networkInfo?.name ?? null,
    currency: networkInfo?.currency ?? "BTC",
    transaction: {
      txid: tx.txid,
      hash: tx.hash,
      version: tx.version,
      size: tx.size,
      vsize: tx.vsize,
      weight: tx.weight,
      locktime: tx.locktime,
      locktimeInterpretation: interpretLocktime(tx.locktime),
      isSegWit,
      isRBF,
      isCoinbase,
      confirmations: tx.confirmations ?? null,
    },
    inputs,
    outputs,
    feeAnalysis,
    blockInclusion,
    mempool: mempoolDetails,
    addresses,
    transactionTypeClassification,
    explorerLink: `${explorerBase}/tx/${txid}`,
  };
}
