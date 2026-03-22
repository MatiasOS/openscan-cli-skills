import { decodeEventLog, decodeFunctionData, keccak256, toBytes, toFunctionSelector } from "viem";
import type { DecodedInput, DecodedParam } from "../types/domain";

interface AbiFunction {
  type: "function";
  name: string;
  inputs: Array<{
    name: string;
    type: string;
    indexed?: boolean;
    components?: Array<{ name: string; type: string }>;
  }>;
  outputs?: Array<{ name: string; type: string }>;
  stateMutability?: string;
}

interface AbiEvent {
  type: "event";
  name: string;
  inputs: Array<{
    name: string;
    type: string;
    indexed?: boolean;
  }>;
  anonymous?: boolean;
}

function buildSignature(abiItem: AbiFunction): string {
  const inputs = abiItem.inputs || [];
  const paramTypes = inputs.map((input) => input.type);
  return `${abiItem.name}(${paramTypes.join(",")})`;
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return `[${value.map((v) => formatValue(v)).join(", ")}]`;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return `{${entries.map(([k, v]) => `${k}: ${formatValue(v)}`).join(", ")}}`;
  }

  return String(value);
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function asAbiFunction(value: unknown): AbiFunction | null {
  const obj = asObject(value);
  if (!obj) return null;
  if (obj.type !== "function" || typeof obj.name !== "string") return null;
  const inputsRaw = Array.isArray(obj.inputs) ? obj.inputs : [];
  const inputs: AbiFunction["inputs"] = [];
  for (const input of inputsRaw) {
    const i = asObject(input);
    if (!i || typeof i.type !== "string") continue;

    const components: { name: string; type: string }[] = [];
    if (Array.isArray(i.components)) {
      for (const c of i.components) {
        const comp = asObject(c);
        if (!comp || typeof comp.name !== "string" || typeof comp.type !== "string") continue;
        components.push({ name: comp.name, type: comp.type });
      }
    }

    const nextInput: AbiFunction["inputs"][number] = {
      name: typeof i.name === "string" ? i.name : "",
      type: i.type,
    };
    if (typeof i.indexed === "boolean") nextInput.indexed = i.indexed;
    if (components.length > 0) nextInput.components = components;
    inputs.push(nextInput);
  }

  return {
    type: "function",
    name: obj.name,
    inputs,
  };
}

function asAbiEvent(value: unknown): AbiEvent | null {
  const obj = asObject(value);
  if (!obj) return null;
  if (obj.type !== "event" || typeof obj.name !== "string") return null;
  const inputsRaw = Array.isArray(obj.inputs) ? obj.inputs : [];
  const inputs: AbiEvent["inputs"] = [];
  for (const input of inputsRaw) {
    const i = asObject(input);
    if (!i || typeof i.type !== "string") continue;
    inputs.push({
      name: typeof i.name === "string" ? i.name : "",
      type: i.type,
      indexed: typeof i.indexed === "boolean" ? i.indexed : false,
    });
  }

  return {
    type: "event",
    name: obj.name,
    inputs,
    anonymous: obj.anonymous === true,
  };
}

export function decodeFunctionCall(data: string, abi: unknown[]): DecodedInput | null {
  if (!data || data === "0x" || data.length < 10) {
    return null;
  }

  if (!abi || !Array.isArray(abi) || abi.length === 0) {
    return null;
  }

  const selector = data.slice(0, 10).toLowerCase();
  const functionItems = abi.map(asAbiFunction).filter((item): item is AbiFunction => item !== null);

  let matchedFunction: AbiFunction | null = null;

  for (const fn of functionItems) {
    try {
      const signature = buildSignature(fn);
      const computedSelector = toFunctionSelector(signature).toLowerCase();
      if (computedSelector === selector) {
        matchedFunction = fn;
        break;
      }
    } catch {
      // Ignore invalid ABI entries.
    }
  }

  if (!matchedFunction) {
    return null;
  }

  const signature = buildSignature(matchedFunction);

  try {
    const decoded = decodeFunctionData({
      abi: [matchedFunction],
      data: data as `0x${string}`,
    });

    const params: DecodedParam[] = [];
    const inputs = matchedFunction.inputs || [];
    const args = decoded.args || [];

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      if (!input) continue;

      const value = args[i];
      params.push({
        name: input.name || `param${i}`,
        type: input.type,
        value: formatValue(value),
        indexed: false,
      });
    }

    return {
      functionName: matchedFunction.name,
      signature,
      params,
    };
  } catch {
    return {
      functionName: matchedFunction.name,
      signature,
      params: [],
    };
  }
}

export function decodeEventWithAbi(topics: string[], data: string, abi: unknown[]): DecodedInput | null {
  if (!topics || topics.length === 0 || !abi || !Array.isArray(abi)) {
    return null;
  }

  const topic0 = topics[0];
  if (!topic0) return null;

  const eventItems = abi.map(asAbiEvent).filter((item): item is AbiEvent => item !== null);

  let matchedEvent: AbiEvent | null = null;

  for (const evt of eventItems) {
    try {
      const inputs = evt.inputs || [];
      const paramTypes = inputs.map((i) => i.type);
      const signature = `${evt.name}(${paramTypes.join(",")})`;
      const computedTopic = keccak256(toBytes(signature)).toLowerCase();
      if (computedTopic === topic0.toLowerCase()) {
        matchedEvent = evt;
        break;
      }
    } catch {
      // Ignore invalid ABI entries.
    }
  }

  if (!matchedEvent) {
    return null;
  }

  const inputs = matchedEvent.inputs || [];
  const signature = `${matchedEvent.name}(${inputs.map((i) => i.type).join(",")})`;

  try {
    const decoded = decodeEventLog({
      abi: [matchedEvent],
      data: data as `0x${string}`,
      topics: topics as [`0x${string}`, ...`0x${string}`[]],
    }) as { args: Record<string | number, unknown> };

    const params: DecodedParam[] = [];
    const args = decoded.args || {};

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      if (!input) continue;

      const value = args[input.name] ?? args[i];
      params.push({
        name: input.name || `param${i}`,
        type: input.type,
        value: formatValue(value),
        indexed: input.indexed || false,
      });
    }

    return {
      functionName: matchedEvent.name,
      signature,
      params,
    };
  } catch {
    return {
      functionName: matchedEvent.name,
      signature,
      params: [],
    };
  }
}

export function tryDecodeUtf8(hex: string): string | null {
  if (!hex || hex === "0x" || hex.length < 4) return null;

  const cleaned = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (cleaned.length === 0 || cleaned.length % 2 !== 0) return null;

  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < cleaned.length; i += 2) {
    const parsed = Number.parseInt(cleaned.substring(i, i + 2), 16);
    if (Number.isNaN(parsed)) return null;
    bytes[i / 2] = parsed;
  }

  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (decoded.length === 0) return null;

  let printable = 0;
  for (let i = 0; i < decoded.length; i++) {
    const code = decoded.charCodeAt(i);
    if (
      (code >= 0x20 && code <= 0x7e) ||
      code === 0x09 ||
      code === 0x0a ||
      code === 0x0d ||
      code >= 0x80
    ) {
      printable++;
    }
  }

  const ratio = printable / decoded.length;
  if (ratio < 0.8) return null;

  return decoded;
}
