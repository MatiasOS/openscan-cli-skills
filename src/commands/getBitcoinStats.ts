import type { OpenScanClient } from "../client";
import { getNetworkInfo } from "../metadata";
import type { BitcoinStatsResult, BtcBlockSummary } from "../types";

export async function getBitcoinStats(
  client: OpenScanClient,
  networkId: string,
): Promise<BitcoinStatsResult> {
  const rpcClient = client.getClient(networkId);

  // Parallel fetch of core stats
  const [blockCountRes, bestBlockHashRes, difficultyRes, mempoolInfoRes, feesFast, feesMedium, feesSlow] =
    await Promise.all([
      rpcClient.getBlockCount(),
      rpcClient.getBestBlockHash(),
      rpcClient.getDifficulty(),
      rpcClient.getMempoolInfo().catch(() => null),
      rpcClient.estimateSmartFee(2).catch(() => null),
      rpcClient.estimateSmartFee(6).catch(() => null),
      rpcClient.estimateSmartFee(24).catch(() => null),
    ]);

  const blockHeight: number = blockCountRes.data;
  const bestBlockHash: string = bestBlockHashRes.data;

  // Fetch latest 3 blocks by walking back from tip
  const latestBlocks: BtcBlockSummary[] = [];
  let currentHash = bestBlockHash;

  for (let i = 0; i < 3 && currentHash; i++) {
    const blockRes = await rpcClient.getBlock(currentHash, 1).catch(() => null);
    if (!blockRes?.data) break;
    const block = blockRes.data;
    latestBlocks.push({
      height: block.height,
      hash: block.hash,
      timestamp: new Date(block.time * 1000).toISOString(),
      txCount: block.nTx,
      size: block.size,
      weight: block.weight,
      difficulty: block.difficulty,
    });
    currentHash = block.previousblockhash ?? "";
  }

  const mempoolData = mempoolInfoRes?.data;

  const networkInfo = await getNetworkInfo(networkId);

  return {
    networkId,
    networkName: networkInfo?.name ?? null,
    currency: networkInfo?.currency ?? null,
    blockHeight,
    difficulty: difficultyRes.data,
    bestBlockHash,
    mempoolSize: mempoolData?.size ?? 0,
    mempoolBytes: mempoolData?.bytes ?? 0,
    mempoolMinFee: mempoolData?.mempoolminfee ?? 0,
    estimatedFee: {
      fast: feesFast?.data?.feerate ?? null,
      medium: feesMedium?.data?.feerate ?? null,
      slow: feesSlow?.data?.feerate ?? null,
    },
    latestBlocks,
    explorerLink: networkId.includes("testnet")
      ? "https://mempool.space/testnet4"
      : "https://mempool.space",
  };
}
