#!/usr/bin/env bun

import { resolveChainId, resolveRpcUrls, resolveStrategy, isBitcoinNetwork } from "../src/config";
import { OpenScanClient } from "../src/client";
import { formatOutput } from "../src/formatter";
import { getNetworkStats } from "../src/commands/getNetworkStats";
import { getBitcoinStats } from "../src/commands/getBitcoinStats";
import { debugTransaction } from "../src/commands/debugTransaction";
import { debugBitcoinTransaction } from "../src/commands/debugBitcoinTransaction";

interface ParsedArgs {
  command: string;
  positional: string[];
  flags: Record<string, string>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  let command = "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = "true";
      }
    } else if (!command) {
      command = arg;
    } else {
      positional.push(arg);
    }
  }

  return { command, positional, flags };
}

function printUsage() {
  console.log(`openscan — Query EVM and Bitcoin blockchain data

Usage: openscan <command> [args] [options]

Commands:
  stats                     Network stats (gas, blocks, sync status)
  debug-tx <txHash>         Debug a transaction (trace + revert decoding)
  help                      Show this help message

Options:
  --chain <chain>           Chain alias or ID (default: ethereum)
  --strategy <strategy>     RPC strategy: fallback, parallel, race (default: fallback)
  --rpc <url>               Use a specific RPC URL

Chain aliases: ethereum, base, arbitrum, optimism, polygon, bnb, avalanche, sepolia, bsctestnet, hardhat, aztec, bitcoin, btc-testnet

Examples:
  openscan stats
  openscan stats --chain base
  openscan stats --chain bitcoin
  openscan stats --chain 42161
  openscan stats --rpc https://eth.llamarpc.com`);
}

async function main() {
  const { command, positional, flags } = parseArgs(process.argv);

  if (!command || command === "help" || flags.help) {
    printUsage();
    process.exit(0);
  }

  try {
    const networkId = resolveChainId(flags.chain ?? "ethereum");
    const strategy = resolveStrategy(flags.strategy);
    const rpcUrls = await resolveRpcUrls(networkId, { rpc: flags.rpc });

    const client = new OpenScanClient({
      rpcUrls: { [String(networkId)]: rpcUrls },
      strategy,
    });

    let result: unknown;

    switch (command) {
      case "stats":
        if (isBitcoinNetwork(networkId)) {
          result = await getBitcoinStats(client, networkId as string);
        } else {
          result = await getNetworkStats(client, networkId as number);
        }
        break;
      case "debug-tx": {
        const txHash = positional[0];
        if (!txHash) {
          throw new Error('Transaction hash required. Usage: openscan debug-tx <txHash> [--chain <chain>]');
        }
        if (isBitcoinNetwork(networkId)) {
          result = await debugBitcoinTransaction(client, networkId as string, txHash);
        } else {
          result = await debugTransaction(client, networkId as number, txHash);
        }
        break;
      }
      default:
        console.error(formatOutput({ error: true, message: `Unknown command: "${command}". Run "openscan help" for usage.` }));
        process.exit(1);
    }

    console.log(formatOutput(result));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(formatOutput({ error: true, message }));
    process.exit(1);
  }
}

main();
