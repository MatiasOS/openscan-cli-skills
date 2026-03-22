import type { OpenScanClient } from "../client";
import { hexToDecimal, hexToBigInt, weiToGwei, weiToEth, decodeRevertReason } from "../formatter";
import { getNetworkInfo } from "../metadata";
import type { TxDebugResult, TxDebugLog } from "../types";

const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

export async function debugTransaction(
  client: OpenScanClient,
  chainId: number,
  txHash: string,
): Promise<TxDebugResult> {
  if (chainId !== 31337) {
    throw new Error("debug-tx is only available for Hardhat (--chain hardhat)");
  }

  if (!TX_HASH_RE.test(txHash)) {
    throw new Error(`Invalid transaction hash: "${txHash}". Must be a 0x-prefixed 32-byte hex string.`);
  }

  const rpcClient = client.getClient(chainId);

  // Parallel fetch tx, receipt, and trace (Hardhat always supports debug_traceTransaction)
  const [txRes, receiptRes, traceRes] = await Promise.all([
    rpcClient.getTransactionByHash(txHash),
    rpcClient.getTransactionReceipt(txHash),
    rpcClient.debugTraceTransaction(txHash, { tracer: "callTracer" }),
  ]);

  if (!txRes.data) {
    throw new Error(`Transaction not found: ${txHash}`);
  }

  const tx = txRes.data;
  const receipt = receiptRes.data;
  const trace = traceRes.data ?? null;

  // Build transaction section
  const gasLimit = hexToDecimal(tx.gas);
  const transaction = {
    hash: tx.hash,
    from: tx.from,
    to: tx.to ?? null,
    value: hexToBigInt(tx.value).toString(),
    valueEth: weiToEth(tx.value),
    nonce: hexToDecimal(tx.nonce),
    gas: gasLimit,
    gasPrice: tx.gasPrice ? BigInt(tx.gasPrice).toString() : null,
    gasPriceGwei: tx.gasPrice ? weiToGwei(tx.gasPrice) : null,
    maxFeePerGas: tx.maxFeePerGas ? BigInt(tx.maxFeePerGas).toString() : null,
    maxFeePerGasGwei: tx.maxFeePerGas ? weiToGwei(tx.maxFeePerGas) : null,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? BigInt(tx.maxPriorityFeePerGas).toString() : null,
    maxPriorityFeePerGasGwei: tx.maxPriorityFeePerGas ? weiToGwei(tx.maxPriorityFeePerGas) : null,
    type: tx.type ? hexToDecimal(tx.type) : 0,
    blockNumber: tx.blockNumber ? hexToDecimal(tx.blockNumber) : null,
    blockHash: tx.blockHash ?? null,
    transactionIndex: tx.transactionIndex ? hexToDecimal(tx.transactionIndex) : null,
    inputData: tx.input,
    inputSize: tx.input ? (tx.input.length - 2) / 2 : 0,
    isContractCreation: tx.to === null,
  };

  // Build receipt section
  let receiptResult: TxDebugResult["receipt"] = null;
  let revertReason: string | null = null;

  if (receipt) {
    const gasUsed = hexToDecimal(receipt.gasUsed);
    const status: "success" | "reverted" | "unknown" =
      receipt.status === "0x1" ? "success" :
      receipt.status === "0x0" ? "reverted" : "unknown";

    const logs: TxDebugLog[] = (receipt.logs ?? []).map((log: any) => ({
      logIndex: hexToDecimal(log.logIndex),
      address: log.address,
      topics: log.topics,
      data: log.data,
    }));

    receiptResult = {
      status,
      gasUsed,
      cumulativeGasUsed: hexToDecimal(receipt.cumulativeGasUsed),
      effectiveGasPrice: receipt.effectiveGasPrice ? BigInt(receipt.effectiveGasPrice).toString() : null,
      effectiveGasPriceGwei: receipt.effectiveGasPrice ? weiToGwei(receipt.effectiveGasPrice) : null,
      gasEfficiency: `${((gasUsed / gasLimit) * 100).toFixed(2)}%`,
      contractAddress: receipt.contractAddress ?? null,
      logsCount: logs.length,
      logs,
    };

    // Decode revert reason for failed transactions
    if (status === "reverted") {
      try {
        const callRes = await rpcClient.callContract(
          { from: tx.from, to: tx.to, data: tx.input, gas: tx.gas, value: tx.value },
          tx.blockNumber,
        );
        // Some nodes return revert data in the response
        if (callRes.data) {
          revertReason = decodeRevertReason(callRes.data);
        }
      } catch (err: any) {
        // Many nodes return revert data in the error
        const errorData = err?.data ?? err?.message ?? "";
        if (typeof errorData === "string" && errorData.startsWith("0x")) {
          revertReason = decodeRevertReason(errorData);
        }
      }
    }
  }

  const networkInfo = await getNetworkInfo(chainId);

  return {
    chainId,
    networkName: networkInfo?.name ?? "Hardhat",
    currency: networkInfo?.currency ?? "ETH",
    transaction,
    receipt: receiptResult,
    revertReason,
    trace,
    explorerLink: chainId === 31337
      ? `http://localhost:8545/#/${chainId}/tx/${txHash}`
      : `https://openscan.eth.link/#/${chainId}/tx/${txHash}`,
  };
}
