import eventsDatabase from "../data/events.json";
import type { DecodedEvent, DecodedParam } from "../types/domain";

interface EventInfo {
  event: string;
  type: string;
  description: string;
}

interface EventsDatabase {
  [signature: string]: EventInfo;
}

interface EventParam {
  type: string;
  indexed: boolean;
}

const events = eventsDatabase as EventsDatabase;

function parseEventSignature(signature: string): {
  name: string;
  params: EventParam[];
} {
  const match = signature.match(/^(\w+)\((.*)\)$/);
  if (!match) {
    return { name: signature, params: [] };
  }

  const name = match[1] || signature;
  const paramsStr = match[2] || "";

  if (!paramsStr) {
    return { name, params: [] };
  }

  const params: EventParam[] = [];
  let depth = 0;
  let current = "";

  for (const char of paramsStr) {
    if (char === "(") {
      depth++;
      current += char;
    } else if (char === ")") {
      depth--;
      current += char;
    } else if (char === "," && depth === 0) {
      if (current) {
        params.push({ type: current.trim(), indexed: false });
      }
      current = "";
    } else {
      current += char;
    }
  }

  if (current) {
    params.push({ type: current.trim(), indexed: false });
  }

  return { name, params };
}

function decodeUint256(hex: string): string {
  if (!hex || hex === "0x") return "0";
  const cleaned = hex.startsWith("0x") ? hex.slice(2) : hex;
  try {
    const value = BigInt(`0x${cleaned}`);
    return value.toString();
  } catch {
    return hex;
  }
}

function decodeAddress(hex: string): string {
  if (!hex) return "";
  const cleaned = hex.startsWith("0x") ? hex.slice(2) : hex;
  const address = cleaned.slice(-40);
  return `0x${address}`;
}

function decodeInt256(hex: string): string {
  if (!hex || hex === "0x") return "0";
  const cleaned = hex.startsWith("0x") ? hex.slice(2) : hex;
  try {
    const value = BigInt(`0x${cleaned}`);
    const maxPositive = BigInt(
      "0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    );
    if (value > maxPositive) {
      const maxUint = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
      return (-(maxUint - value + BigInt(1))).toString();
    }
    return value.toString();
  } catch {
    return hex;
  }
}

function decodeBytes32(hex: string): string {
  return hex;
}

function decodeBool(hex: string): string {
  const value = decodeUint256(hex);
  return value === "1" ? "true" : "false";
}

function decodeValue(hex: string, type: string): string {
  if (!hex) return "";

  const baseType = type.replace(/\[\]$/, "");

  if (baseType === "address") {
    return decodeAddress(hex);
  }
  if (baseType.startsWith("uint")) {
    return decodeUint256(hex);
  }
  if (baseType.startsWith("int")) {
    return decodeInt256(hex);
  }
  if (baseType === "bool") {
    return decodeBool(hex);
  }
  if (baseType === "bytes32") {
    return decodeBytes32(hex);
  }
  return hex;
}

function decodeEventData(data: string, params: EventParam[]): string[] {
  if (!data || data === "0x") return [];

  const cleaned = data.startsWith("0x") ? data.slice(2) : data;
  const values: string[] = [];

  const chunkSize = 64;
  let offset = 0;

  for (const param of params) {
    if (offset >= cleaned.length) break;

    const chunk = `0x${cleaned.slice(offset, offset + chunkSize)}`;
    values.push(decodeValue(chunk, param.type));
    offset += chunkSize;
  }

  return values;
}

export function lookupEvent(topic0: string): EventInfo | null {
  const normalizedTopic = topic0.toLowerCase();

  for (const [sig, info] of Object.entries(events)) {
    if (sig.toLowerCase() === normalizedTopic) {
      return info;
    }
  }

  return null;
}

export function decodeEventLog(topics: string[], data: string): DecodedEvent | null {
  if (!topics || topics.length === 0) return null;

  const topic0 = topics[0];
  if (!topic0) return null;

  const eventInfo = lookupEvent(topic0);
  if (!eventInfo) return null;

  const { name, params } = parseEventSignature(eventInfo.event);
  const indexedCount = topics.length - 1;

  const decodedParams: DecodedParam[] = [];
  let topicIndex = 1;

  for (let i = 0; i < params.length && topicIndex < topics.length; i++) {
    const param = params[i];
    if (!param) continue;

    const topicValue = topics[topicIndex];
    if (topicIndex <= indexedCount && topicValue) {
      decodedParams.push({
        name: getParamName(name, i),
        type: param.type,
        value: decodeValue(topicValue, param.type),
        indexed: true,
      });
      topicIndex++;
    }
  }

  const remainingParams = params.slice(decodedParams.length);
  const dataValues = decodeEventData(data, remainingParams);

  for (let i = 0; i < remainingParams.length; i++) {
    const param = remainingParams[i];
    if (!param) continue;

    decodedParams.push({
      name: getParamName(name, decodedParams.length),
      type: param.type,
      value: dataValues[i] || "",
      indexed: false,
    });
  }

  return {
    name,
    signature: topic0,
    fullSignature: eventInfo.event,
    type: eventInfo.type,
    description: eventInfo.description,
    params: decodedParams,
  };
}

function getParamName(eventName: string, index: number): string {
  const paramNames: Record<string, string[]> = {
    Transfer: ["from", "to", "value"],
    Approval: ["owner", "spender", "value"],
    ApprovalForAll: ["owner", "operator", "approved"],
    Swap: ["sender", "amount0In", "amount1In", "amount0Out", "amount1Out", "to"],
    Mint: ["sender", "amount0", "amount1"],
    Burn: ["sender", "amount0", "amount1", "to"],
    Sync: ["reserve0", "reserve1"],
    Deposit: ["sender", "owner", "assets", "shares"],
    Withdraw: ["sender", "receiver", "owner", "assets", "shares"],
    Borrow: ["reserve", "user", "amount", "borrowRateMode"],
    Repay: ["reserve", "user", "repayer", "amount"],
    OwnershipTransferred: ["previousOwner", "newOwner"],
    RoleGranted: ["role", "account", "sender"],
    RoleRevoked: ["role", "account", "sender"],
  };

  const names = paramNames[eventName];
  if (names && index < names.length) {
    return names[index] || `param${index}`;
  }

  return `param${index}`;
}

export function formatDecodedValue(value: string, type: string): string {
  if (!value) return "";

  if (type.startsWith("uint") || type.startsWith("int")) {
    try {
      const num = BigInt(value);
      if (num > BigInt(1e15)) {
        const ethValue = Number(num) / 1e18;
        if (ethValue >= 0.0001 && ethValue < 1e15) {
          return `${num.toString()} (≈${ethValue.toFixed(6)} if 18 decimals)`;
        }
      }
      return num.toLocaleString();
    } catch {
      return value;
    }
  }

  return value;
}

export function getEventTypeColor(type: string): string {
  const colors: Record<string, string> = {
    erc: "#10b981",
    dex_v2: "#8b5cf6",
    dex_v3: "#a855f7",
    vault: "#f59e0b",
    lending: "#3b82f6",
    l2_bridge: "#ec4899",
    nft_market: "#14b8a6",
    admin: "#6b7280",
  };

  return colors[type] || "#6b7280";
}
