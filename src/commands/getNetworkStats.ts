import type { OpenScanClient } from "../client";
import { hexToDecimal, weiToGwei, hexTimestampToISO } from "../formatter";
import { getNetworkInfo } from "../metadata";
import type { NetworkStatsResult, BlockSummary } from "../types";

export async function getNetworkStats(
  client: OpenScanClient,
  chainId: number,
): Promise<NetworkStatsResult> {
  const rpcClient = client.getClient(chainId);

  // Parallel fetch of core stats
  const [blockNumberRes, gasPriceRes, priorityFeeRes, syncingRes, clientVersionRes] =
    await Promise.all([
      rpcClient.blockNumber(),
      rpcClient.gasPrice(),
      rpcClient.maxPriorityFeePerGas().catch(() => null),
      rpcClient.syncing(),
      rpcClient.clientVersion().catch(() => ({ data: "unknown" })),
    ]);

  const blockNumber = hexToDecimal(blockNumberRes.data);
  const gasPriceHex: string = gasPriceRes.data;
  const priorityFeeHex: string | null = priorityFeeRes?.data ?? null;

  // Fetch latest 3 blocks
  const blockPromises: Promise<any>[] = [];
  for (let i = 0; i < 3; i++) {
    const num = `0x${(blockNumber - i).toString(16)}`;
    blockPromises.push(rpcClient.getBlockByNumber(num, false).catch(() => null));
  }
  const blockResults = await Promise.all(blockPromises);

  const latestBlocks: BlockSummary[] = blockResults
    .filter((res) => res?.data)
    .map((res) => {
      const block = res.data;
      return {
        number: hexToDecimal(block.number),
        hash: block.hash,
        timestamp: hexTimestampToISO(block.timestamp),
        gasUsed: hexToDecimal(block.gasUsed),
        gasLimit: hexToDecimal(block.gasLimit),
        txCount: Array.isArray(block.transactions) ? block.transactions.length : 0,
        baseFeePerGas: block.baseFeePerGas ?? null,
      };
    });

  // Extract base fee from latest block
  const latestBlock = latestBlocks[0] ?? null;
  const baseFee = latestBlock?.baseFeePerGas ?? null;

  // Get network name from metadata
  const networkInfo = await getNetworkInfo(chainId);

  return {
    chainId,
    networkName: networkInfo?.name ?? null,
    currency: networkInfo?.currency ?? null,
    gasPrice: BigInt(gasPriceHex).toString(),
    gasPriceGwei: weiToGwei(gasPriceHex),
    baseFee: baseFee ? BigInt(baseFee).toString() : null,
    baseFeeGwei: baseFee ? weiToGwei(baseFee) : null,
    maxPriorityFee: priorityFeeHex ? BigInt(priorityFeeHex).toString() : null,
    maxPriorityFeeGwei: priorityFeeHex ? weiToGwei(priorityFeeHex) : null,
    blockNumber,
    isSyncing: syncingRes.data,
    clientVersion: clientVersionRes.data,
    latestBlocks,
    explorerLink: `https://openscan.eth.link/#/${chainId}`,
  };
}
