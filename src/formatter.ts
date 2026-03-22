export function formatOutput(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export function hexToDecimal(hex: string): number {
  return parseInt(hex, 16);
}

export function hexToBigInt(hex: string): bigint {
  return BigInt(hex);
}

export function weiToGwei(weiHex: string): string {
  const wei = BigInt(weiHex);
  // Use 6 decimal places for precision (handles sub-gwei values like on testnets)
  const scaled = wei * 1_000_000n;
  const gweiScaled = scaled / 10n ** 9n;
  const integer = gweiScaled / 1_000_000n;
  const fractional = gweiScaled % 1_000_000n;
  if (fractional === 0n) return integer.toString();
  // Trim trailing zeros
  const frac = fractional.toString().padStart(6, "0").replace(/0+$/, "");
  return `${integer}.${frac}`;
}

export function weiToEth(weiHex: string): string {
  const wei = BigInt(weiHex);
  const eth = Number(wei) / 1e18;
  return eth.toFixed(6);
}

export function hexTimestampToISO(hex: string): string {
  return new Date(parseInt(hex, 16) * 1000).toISOString();
}

const PANIC_CODES: Record<number, string> = {
  0x01: "Assertion failed",
  0x11: "Arithmetic overflow/underflow",
  0x12: "Division or modulo by zero",
  0x21: "Invalid enum value",
  0x22: "Invalid storage byte array encoding",
  0x31: "Pop on empty array",
  0x32: "Array index out of bounds",
  0x41: "Out of memory",
  0x51: "Uninitialized function pointer",
};

export function decodeRevertReason(data: string): string | null {
  if (!data || data === "0x" || data.length < 10) return null;

  const selector = data.slice(0, 10).toLowerCase();

  // Error(string) - selector 0x08c379a2
  if (selector === "0x08c379a2") {
    try {
      const hex = data.slice(10);
      // offset is at bytes 0-32 (always 0x20 = 32)
      // string length at bytes 32-64
      const length = parseInt(hex.slice(64, 128), 16);
      // string data starts at byte 64
      const strHex = hex.slice(128, 128 + length * 2);
      return Buffer.from(strHex, "hex").toString("utf8");
    } catch {
      return null;
    }
  }

  // Panic(uint256) - selector 0x4e487b71
  if (selector === "0x4e487b71") {
    try {
      const code = parseInt(data.slice(10, 74), 16);
      return PANIC_CODES[code] ?? `Panic(0x${code.toString(16)})`;
    } catch {
      return null;
    }
  }

  // Unknown custom error — return the 4-byte selector
  return `Custom error: ${data.slice(0, 10)}`;
}
