/**
 * Rehype plugin: find math in text nodes ($...$ and $$...$$) and render with KaTeX.
 * Does not use remark-math, so avoids parser bugs that cause "Cannot set properties of undefined".
 * Each math segment is rendered in try/catch so one bad segment doesn't break the rest.
 */
import { fromHtmlIsomorphic } from "hast-util-from-html-isomorphic";
import katex from "katex";
import type { Root, Text, ElementContent } from "hast";
import { visit } from "unist-util-visit";

type HastText = Text & { type: "text"; value: string };
type HastElement = ElementContent & { type: "element"; tagName: string; properties?: Record<string, unknown>; children?: ElementContent[] };

const INLINE_RE = /\$([^$\n]+)\$/g;
const DISPLAY_RE = /\$\$([^$]*?)\$\$/g;

/** Placeholder used in markdown for _ so GFM doesn't break subscripts. Restore before KaTeX. */
export const UNDERSCORE_PLACEHOLDER = "\uE000";

function parseMathInText(value: string): ElementContent[] {
  const nodes: ElementContent[] = [];
  let lastEnd = 0;

  // Find next $ or $$ (whichever comes first)
  const next = (): { kind: "inline"; start: number; end: number; inner: string } | { kind: "display"; start: number; end: number; inner: string } | null => {
    let best: { kind: "inline" | "display"; start: number; end: number; inner: string } | null = null;
    INLINE_RE.lastIndex = lastEnd;
    DISPLAY_RE.lastIndex = lastEnd;
    const mi = INLINE_RE.exec(value);
    const md = DISPLAY_RE.exec(value);
    if (mi) best = { kind: "inline", start: mi.index, end: mi.index + mi[0].length, inner: mi[1] };
    if (md && (best === null || md.index < best.start))
      best = { kind: "display", start: md.index, end: md.index + md[0].length, inner: md[1] };
    return best;
  };

  let m: ReturnType<typeof next>;
  while ((m = next()) !== null) {
    if (m.start > lastEnd) {
      nodes.push({ type: "text", value: value.slice(lastEnd, m.start) } as HastText);
    }
    try {
      const latex = m.inner.trim().replace(/\uE000/g, "_");
      const html = katex.renderToString(latex, {
        throwOnError: false,
        displayMode: m.kind === "display",
        strict: "ignore",
      });
      const root = fromHtmlIsomorphic(html, { fragment: true }) as Root;
      const rootChildren = root?.children;
      if (Array.isArray(rootChildren) && rootChildren.length > 0) {
        const valid = rootChildren.filter((c): c is ElementContent => c != null);
        if (valid.length > 0) nodes.push(...valid);
        else nodes.push({ type: "text", value: m.kind === "display" ? `$$${m.inner}$$` : `$${m.inner}$` } as HastText);
      } else {
        nodes.push({ type: "text", value: m.kind === "display" ? `$$${m.inner}$$` : `$${m.inner}$` } as HastText);
      }
    } catch {
      nodes.push({ type: "text", value: m.kind === "display" ? `$$${m.inner}$$` : `$${m.inner}$` } as HastText);
    }
    lastEnd = m.end;
  }
  if (lastEnd < value.length) {
    nodes.push({ type: "text", value: value.slice(lastEnd) } as HastText);
  }
  return nodes;
}

export function rehypeMathFromText() {
  return function (tree: Root) {
    if (tree == null || typeof tree !== "object" || !("children" in tree) || !Array.isArray(tree.children)) return;
    visit(tree, "text", (node: HastText, index, parent) => {
      try {
        if (
          !parent ||
          index == null ||
          index < 0 ||
          !Array.isArray(parent.children) ||
          index >= parent.children.length
        )
          return;
        if (typeof node.value !== "string" || node.value.indexOf("$") === -1) return;
        const nodes = parseMathInText(node.value);
        if (nodes.length <= 1) return; // no math found or only one text node unchanged
        parent.children.splice(index, 1, ...nodes);
      } catch {
        // Leave node unchanged on any error so the plugin never throws
      }
    });
  };
}
