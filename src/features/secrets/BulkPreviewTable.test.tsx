import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BulkEntryResult, BulkSecretAction, BulkSummary } from "../../store/secretsContract";
import BulkPreviewTable, { BulkPreviewTableProps, unmanagedId } from "./BulkPreviewTable";
import { SecretsFileIssue } from "./secretsFile";

const entry = (
  index: number,
  key: string,
  action: BulkSecretAction,
  extra: Partial<BulkEntryResult> = {},
): BulkEntryResult => ({
  index,
  key,
  provider: "default",
  action,
  applied: false,
  ...extra,
});

const summaryFor = (results: BulkEntryResult[]): BulkSummary => ({
  total: results.length,
  create: results.filter((r) => r.action === "create").length,
  overwrite: results.filter((r) => r.action === "overwrite").length,
  skip: results.filter((r) => r.action === "skip").length,
  invalid: results.filter((r) => r.action === "invalid").length,
  failed: results.filter((r) => r.action === "failed").length,
});

function renderTable(overrides: Partial<BulkPreviewTableProps> = {}) {
  const results = overrides.results ?? [
    entry(0, "newKey", "create"),
    entry(1, "existingKey", "overwrite"),
  ];
  const onOverwriteChange = vi.fn();

  const props: BulkPreviewTableProps = {
    results,
    summary: overrides.summary ?? summaryFor(results),
    warnings: [],
    unmanagedKeys: new Set<string>(),
    overwrite: false,
    onOverwriteChange,
    ...overrides,
  };

  render(<BulkPreviewTable {...props} />);
  return { onOverwriteChange };
}

const row = (key: string) => screen.getByText(key).closest("tr") as HTMLElement;

describe("rows and badges", () => {
  it("renders one row per entry with the right action badge", () => {
    const results = [
      entry(0, "a", "create"),
      entry(1, "b", "overwrite"),
      entry(2, "c", "skip"),
      entry(3, "d", "invalid"),
      entry(4, "e", "failed"),
    ];
    renderTable({ results, summary: summaryFor(results) });

    expect(within(row("a")).getByText("Create")).toBeInTheDocument();
    expect(within(row("b")).getByText("Overwrite")).toBeInTheDocument();
    expect(within(row("c")).getByText("Skip")).toBeInTheDocument();
    expect(within(row("d")).getByText("Invalid")).toBeInTheDocument();
    expect(within(row("e")).getByText("Failed")).toBeInTheDocument();
  });

  it("shows each entry's note", () => {
    const results = [
      entry(0, "a", "skip", { message: "Already exists; enable overwrite to replace it." }),
    ];
    renderTable({ results, summary: summaryFor(results) });

    expect(screen.getByText(/Already exists/)).toBeInTheDocument();
  });

  it("marks entries that were actually written", () => {
    const results = [entry(0, "a", "create", { applied: true })];
    renderTable({ results, summary: summaryFor(results) });

    expect(within(row("a")).getByText("applied")).toBeInTheDocument();
  });

  it("renders a placeholder for a blank key rather than an empty cell", () => {
    const results = [entry(0, "", "invalid", { message: "A secret key is required." })];
    renderTable({ results, summary: summaryFor(results) });

    expect(screen.getByText("(blank)")).toBeInTheDocument();
  });

  it("handles an empty batch", () => {
    renderTable({ results: [], summary: summaryFor([]) });
    expect(screen.getByText("Nothing to apply.")).toBeInTheDocument();
  });
});

describe("summary", () => {
  it("counts each outcome", () => {
    const results = [
      entry(0, "a", "create"),
      entry(1, "b", "overwrite"),
      entry(2, "c", "skip"),
      entry(3, "d", "invalid"),
    ];
    renderTable({ results, summary: summaryFor(results) });

    expect(screen.getByText(/1 new/)).toBeInTheDocument();
    expect(screen.getByText(/1 overwrite/)).toBeInTheDocument();
    expect(screen.getByText(/1 skipped/)).toBeInTheDocument();
    expect(screen.getByText(/1 invalid/)).toBeInTheDocument();
  });

  it("states plainly that nothing has been written yet", () => {
    renderTable();
    expect(screen.getByText(/Nothing has been changed yet/)).toBeInTheDocument();
  });

  it("says so when a file would write nothing", () => {
    const results = [entry(0, "a", "skip")];
    renderTable({ results, summary: summaryFor(results) });

    expect(screen.getByText("Nothing in this file would be written.")).toBeInTheDocument();
  });
});

describe("overwrite control", () => {
  it("reports a change so the caller can re-run the preview", () => {
    const { onOverwriteChange } = renderTable();

    fireEvent.click(screen.getByLabelText("Replace secrets that already exist"));
    expect(onOverwriteChange).toHaveBeenCalledWith(true);
  });

  it("is disabled while a preview is in flight", () => {
    renderTable({ isRefreshing: true });
    expect(screen.getByLabelText("Replace secrets that already exist")).toBeDisabled();
  });

  it("is hidden once the batch has been applied", () => {
    renderTable({ readOnly: true });
    expect(
      screen.queryByLabelText("Replace secrets that already exist"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Nothing has been changed yet/)).not.toBeInTheDocument();
  });
});

// The guard that stops a round-tripped template destroying another subsystem's records - Mobile
// Control's pairing tokens live in the same flat data store.
describe("unmanaged targets", () => {
  it("flags an entry that would overwrite a record this tool does not manage", () => {
    const results = [entry(0, "mcTokens", "overwrite"), entry(1, "mine", "overwrite")];
    renderTable({
      results,
      summary: summaryFor(results),
      unmanagedKeys: new Set([unmanagedId("default", "mcTokens")]),
    });

    expect(within(row("mcTokens")).getByText("not managed here")).toBeInTheDocument();
    expect(within(row("mine")).queryByText("not managed here")).not.toBeInTheDocument();
  });

  it("does not flag an entry that is merely being skipped", () => {
    const results = [entry(0, "mcTokens", "skip", { reason: "unmanagedTarget" })];
    renderTable({
      results,
      summary: summaryFor(results),
      unmanagedKeys: new Set([unmanagedId("default", "mcTokens")]),
    });

    expect(screen.queryByText("not managed here")).not.toBeInTheDocument();
  });

  it("scopes the match to the provider, so the same key elsewhere is not flagged", () => {
    const results = [entry(0, "shared", "overwrite")];
    renderTable({
      results,
      summary: summaryFor(results),
      unmanagedKeys: new Set([unmanagedId("CrestronGlobalSecrets", "shared")]),
    });

    expect(screen.queryByText("not managed here")).not.toBeInTheDocument();
  });
});

describe("client-side warnings", () => {
  it("lists problems found while parsing the file", () => {
    const warnings: SecretsFileIssue[] = [
      { code: "emptyValue", message: '"blank" has a blank value.', index: 2 },
      { code: "duplicate", message: '"dup" appears more than once.', index: 4 },
    ];
    renderTable({ warnings });

    expect(screen.getByText("2 problems in the file:")).toBeInTheDocument();
    expect(screen.getByText('"blank" has a blank value.')).toBeInTheDocument();
    expect(screen.getByText('"dup" appears more than once.')).toBeInTheDocument();
  });

  it("omits the warning block entirely when the file was clean", () => {
    renderTable({ warnings: [] });
    expect(screen.queryByText(/problem/)).not.toBeInTheDocument();
  });
});
