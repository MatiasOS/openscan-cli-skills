import { describe, expect, it } from "vitest";
import sampleRawTrace from "../fixtures/sample-raw-trace.json";
import { runRawTraceUseCase } from "../entries/raw-trace.entry";
import type { TraceResult } from "../types/domain";

describe("runRawTraceUseCase", () => {
  it("supports pagination boundaries and expanded rows", () => {
    const trace = sampleRawTrace as TraceResult;

    const firstPage = runRawTraceUseCase({
      trace,
      page: 0,
      opcodesPerPage: 2,
      expandedSteps: [1],
    });

    expect(firstPage.summary.steps).toBe(3);
    expect(firstPage.pagination.totalPages).toBe(2);
    expect(firstPage.pagination.fromStep).toBe(1);
    expect(firstPage.pagination.toStep).toBe(2);
    expect(firstPage.rows.length).toBe(2);
    expect(firstPage.rows[1]?.isExpanded).toBe(true);
    expect(firstPage.rows[1]?.stack?.length).toBeGreaterThan(0);
    expect(firstPage.rows[1]?.color).toBe("#06b6d4");

    const overflowPage = runRawTraceUseCase({
      trace,
      page: 99,
      opcodesPerPage: 2,
    });

    expect(overflowPage.pagination.page).toBe(1);
    expect(overflowPage.pagination.fromStep).toBe(3);
    expect(overflowPage.pagination.toStep).toBe(3);
    expect(overflowPage.rows.length).toBe(1);
    expect(overflowPage.rows[0]?.op).toBe("SSTORE");
    expect(overflowPage.rows[0]?.color).toBe("#eab308");
  });
});
