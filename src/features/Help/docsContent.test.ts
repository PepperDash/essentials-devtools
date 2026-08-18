import { describe, expect, it } from "vitest";
import { docsMap, docsNavTree, getDocBySlug, resolveRelativeLink } from "./docsContent";

describe("docsContent", () => {
  it("indexes the root docs README under the empty slug", () => {
    const root = getDocBySlug("");
    expect(root).toBeDefined();
    expect(root?.isIndex).toBe(true);
    expect(root?.title).toMatch(/Documentation/i);
  });

  it("indexes category READMEs and leaf docs", () => {
    expect(getDocBySlug("tutorials")?.isIndex).toBe(true);
    expect(getDocBySlug("tutorials/getting-started")?.isIndex).toBe(false);
    expect(getDocBySlug("tutorials/getting-started")?.category).toBe(
      "tutorials",
    );
  });

  it("orders tutorial pages the way tutorials/README.md links them, not alphabetically", () => {
    const tutorials = docsNavTree.find((c) => c.category === "tutorials");
    expect(tutorials?.pages.map((p) => p.slug)).toEqual([
      "tutorials/getting-started",
      "tutorials/debug-console-basics",
      "tutorials/device-management-basics",
    ]);
  });

  it("resolves a same-directory relative link", () => {
    expect(
      resolveRelativeLink(
        "tutorials/debug-console-basics",
        "./getting-started.md",
      ),
    ).toBe("/help/tutorials/getting-started");
  });

  it("resolves a parent-directory folder link to a category index", () => {
    expect(
      resolveRelativeLink("tutorials/debug-console-basics", "../how-to/"),
    ).toBe("/help/how-to");
  });

  it("resolves a root-relative README link to the docs home", () => {
    expect(
      resolveRelativeLink("tutorials/getting-started", "../README.md"),
    ).toBe("/help");
  });

  it("returns null for external and anchor links", () => {
    expect(resolveRelativeLink("", "https://diataxis.fr/")).toBeNull();
    expect(resolveRelativeLink("", "mailto:test@example.com")).toBeNull();
    expect(resolveRelativeLink("tutorials", "#some-heading")).toBeNull();
  });

  it("resolves a relative link with a trailing heading fragment, preserving the fragment", () => {
    expect(
      resolveRelativeLink(
        "how-to/trace-signal-routes",
        "../reference/ui-components.md#routing-diagram",
      ),
    ).toBe("/help/reference/ui-components#routing-diagram");
  });

  it("has every doc reachable from docsMap for links found across the docs", () => {
    expect(docsMap.size).toBeGreaterThan(0);
  });

  it("includes the new routing how-to guide in the how-to nav category", () => {
    const howTo = docsNavTree.find((c) => c.category === "how-to");
    expect(howTo?.pages.map((p) => p.slug)).toContain(
      "how-to/trace-signal-routes",
    );
  });
});
