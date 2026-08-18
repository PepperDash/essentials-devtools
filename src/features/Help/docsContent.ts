export type DocCategory = "tutorials" | "how-to" | "reference" | "explanation";

export interface DocEntry {
  slug: string;
  category: DocCategory | null;
  title: string;
  content: string;
  isIndex: boolean;
}

interface CategoryNav {
  category: DocCategory;
  label: string;
  indexSlug: string;
  pages: { slug: string; title: string }[];
}

const CATEGORY_LABELS: Record<DocCategory, string> = {
  tutorials: "Tutorials",
  "how-to": "How-to Guides",
  reference: "Reference",
  explanation: "Explanation",
};

const CATEGORY_ORDER: DocCategory[] = [
  "tutorials",
  "how-to",
  "reference",
  "explanation",
];

function normalizePath(raw: string): { slug: string; isIndex: boolean } {
  const trimmed = raw.replace(/^\/docs\//, "").replace(/\.md$/, "");
  if (trimmed === "README") {
    return { slug: "", isIndex: true };
  }
  if (trimmed.endsWith("/README")) {
    return { slug: trimmed.slice(0, -"/README".length), isIndex: true };
  }
  return { slug: trimmed, isIndex: false };
}

function deriveTitle(content: string, slug: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  if (match) return match[1].trim();
  const last = slug.split("/").pop() || slug;
  return last
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Joins a markdown-relative href against the directory of the doc that
// contains it, collapsing "." and ".." segments manually (no Node `path`
// module available in the browser bundle).
function joinRelative(baseDir: string, href: string): string {
  const baseSegments = baseDir ? baseDir.split("/") : [];
  const hrefSegments = href.split("/");
  const stack = [...baseSegments];

  for (const segment of hrefSegments) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      stack.pop();
    } else {
      stack.push(segment);
    }
  }

  return stack.join("/");
}

function buildDocsMap(): Map<string, DocEntry> {
  const rawModules = import.meta.glob("/docs/**/*.md", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;

  const map = new Map<string, DocEntry>();

  for (const [path, content] of Object.entries(rawModules)) {
    const { slug, isIndex } = normalizePath(path);
    const category = slug
      ? ((slug.split("/")[0] as DocCategory) ?? null)
      : null;

    map.set(slug, {
      slug,
      category: CATEGORY_ORDER.includes(category as DocCategory)
        ? (category as DocCategory)
        : null,
      title: deriveTitle(content, slug),
      content,
      isIndex,
    });
  }

  return map;
}

// Extracts the order pages are linked in a category's README (e.g.
// "[Getting Started](./getting-started.md)") so the in-app nav mirrors the
// deliberate, pedagogical ordering the docs authors already chose, rather
// than falling back to alphabetical order for everything.
function extractLinkOrder(readmeContent: string): string[] {
  const order: string[] = [];
  const linkPattern = /\]\(\.\/([a-z0-9-]+)\.md\)/g;
  let match: RegExpExecArray | null;
  while ((match = linkPattern.exec(readmeContent)) !== null) {
    if (!order.includes(match[1])) order.push(match[1]);
  }
  return order;
}

function buildNavTree(docsMap: Map<string, DocEntry>): CategoryNav[] {
  return CATEGORY_ORDER.map((category) => {
    const indexEntry = docsMap.get(category);
    const linkOrder = indexEntry ? extractLinkOrder(indexEntry.content) : [];

    const pages = Array.from(docsMap.values())
      .filter((doc) => doc.category === category && !doc.isIndex)
      .sort((a, b) => {
        const aName = a.slug.split("/").pop() ?? a.slug;
        const bName = b.slug.split("/").pop() ?? b.slug;
        const aIndex = linkOrder.indexOf(aName);
        const bIndex = linkOrder.indexOf(bName);
        if (aIndex === -1 && bIndex === -1) return aName.localeCompare(bName);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      })
      .map((doc) => ({ slug: doc.slug, title: doc.title }));

    return {
      category,
      label: CATEGORY_LABELS[category],
      indexSlug: category,
      pages,
    };
  });
}

export const docsMap = buildDocsMap();
export const docsNavTree = buildNavTree(docsMap);

export function getDocBySlug(slug: string): DocEntry | undefined {
  return docsMap.get(slug);
}

// Resolves a markdown-relative link found inside the doc at `currentSlug`
// (e.g. "./foo.md", "../how-to/", "../tutorials/getting-started.md") into
// an in-app "/help/<slug>" path. Returns null if `href` isn't a relative
// doc link (callers should render those as plain external anchors).
export function resolveRelativeLink(
  currentSlug: string,
  href: string,
): string | null {
  if (/^([a-z][a-z0-9+.-]*:|#)/i.test(href)) return null;

  const hashIndex = href.indexOf("#");
  const path = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : href.slice(hashIndex);

  const currentDir = currentSlug.includes("/")
    ? currentSlug.slice(0, currentSlug.lastIndexOf("/"))
    : "";

  const joined = joinRelative(currentDir, path)
    .replace(/\.md$/, "")
    .replace(/\/$/, "");
  const { slug } = normalizePath(`/docs/${joined}.md`);

  if (!docsMap.has(slug)) return null;
  return (slug === "" ? "/help" : `/help/${slug}`) + hash;
}
