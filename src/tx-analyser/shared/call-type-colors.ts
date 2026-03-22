export const CALL_TYPE_COLORS: Record<string, string> = {
  CALL: "#3b82f6",
  DELEGATECALL: "#f97316",
  STATICCALL: "#8b5cf6",
  CREATE: "#10b981",
  CREATE2: "#10b981",
  SELFDESTRUCT: "#ef4444",
};

export function getCallTypeColor(type: string): string {
  return CALL_TYPE_COLORS[type.toUpperCase()] ?? "#6b7280";
}
