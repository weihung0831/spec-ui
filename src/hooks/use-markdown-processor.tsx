import { useMemo, useState, useEffect } from "react"
import { jsx, jsxs, Fragment } from "react/jsx-runtime"
import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkGfm from "remark-gfm"
import remarkRehype from "remark-rehype"
import rehypeSanitize from "rehype-sanitize"
import rehypeHighlight from "rehype-highlight"
import rehypeReact from "rehype-react"
import type { ReactElement, HTMLAttributes } from "react"
import { HeadingRenderer } from "@/components/preview/custom-components/heading-renderer"
import { CodeBlockRenderer } from "@/components/preview/custom-components/code-block-renderer"
import {
  TableRenderer,
  TableHeadRenderer,
  TableBodyRenderer,
  TableRowRenderer,
  TableCellRenderer,
  TableHeaderCellRenderer,
} from "@/components/preview/custom-components/table-renderer"
import { CheckboxRenderer } from "@/components/preview/custom-components/checkbox-renderer"

type AnyProps = Record<string, unknown>

/**
 * Build unified processor with custom component map.
 * Defined outside hook so it's created once (singleton).
 */
function buildProcessor() {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSanitize)
    .use(rehypeHighlight, {
      detect: true,
      ignoreMissing: true,
      aliases: { xml: ["blade", "html.php", "vue-html"] },
    } as AnyProps)
    .use(rehypeReact, {
      jsx,
      jsxs,
      Fragment,
      components: {
        // Headings
        h1: (props: HTMLAttributes<HTMLHeadingElement>) => <HeadingRenderer level={1} {...props} />,
        h2: (props: HTMLAttributes<HTMLHeadingElement>) => <HeadingRenderer level={2} {...props} />,
        h3: (props: HTMLAttributes<HTMLHeadingElement>) => <HeadingRenderer level={3} {...props} />,
        h4: (props: HTMLAttributes<HTMLHeadingElement>) => <HeadingRenderer level={4} {...props} />,
        h5: (props: HTMLAttributes<HTMLHeadingElement>) => <HeadingRenderer level={5} {...props} />,
        h6: (props: HTMLAttributes<HTMLHeadingElement>) => <HeadingRenderer level={6} {...props} />,

        // Pre — wraps fenced code blocks; pass-through but tag children as block
        pre: (props: HTMLAttributes<HTMLPreElement>) => (
          <CodeBlockRenderer {...props} isBlock />
        ),

        // Code — always render as inline; block code is handled by pre above
        code: (props: HTMLAttributes<HTMLElement>) => (
          <code className="rounded bg-muted px-1.5 py-0.5 text-[0.85em] font-mono text-foreground">
            {props.children}
          </code>
        ),

        // Tables
        table: (props: HTMLAttributes<HTMLTableElement>) => <TableRenderer {...props} />,
        thead: (props: HTMLAttributes<HTMLTableSectionElement>) => (
          <TableHeadRenderer {...props} />
        ),
        tbody: (props: HTMLAttributes<HTMLTableSectionElement>) => (
          <TableBodyRenderer {...props} />
        ),
        tr: (props: HTMLAttributes<HTMLTableRowElement>) => <TableRowRenderer {...props} />,
        td: (props: HTMLAttributes<HTMLTableCellElement>) => <TableCellRenderer {...props} />,
        th: (props: HTMLAttributes<HTMLTableCellElement>) => (
          <TableHeaderCellRenderer {...props} />
        ),

        // GFM task list items
        li: (props: HTMLAttributes<HTMLLIElement>) => {
          const { className, children } = props
          const isTaskItem = typeof className === "string" && className.includes("task-list-item")
          if (!isTaskItem) return <li {...props} />

          const arr = Array.isArray(children) ? (children as ReactElement[]) : [children as ReactElement]
          const checkboxEl = arr.find(
            (c): c is ReactElement =>
              c != null &&
              typeof c === "object" &&
              "type" in c &&
              (c as ReactElement).type === "input",
          )
          const checked = Boolean((checkboxEl?.props as { checked?: boolean })?.checked)
          const rest = arr.filter((c) => c !== checkboxEl)
          return <CheckboxRenderer checked={checked}>{rest}</CheckboxRenderer>
        },
      },
    } as Parameters<typeof rehypeReact>[0])
}

const processor = buildProcessor()

/**
 * Processes markdown string through unified pipeline with debounce.
 * Returns React element tree ready to render.
 */
export function useMarkdownProcessor(markdown: string, debounceMs = 300) {
  const [result, setResult] = useState<ReactElement | null>(null)

  // Immediate first render (no debounce)
  useMemo(() => {
    processor
      .process(markdown)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((vfile: any) => setResult(vfile.result as ReactElement))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced updates on subsequent changes
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      processor
        .process(markdown)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((vfile: any) => {
          if (!cancelled) setResult(vfile.result as ReactElement)
        })
        .catch(() => {})
    }, debounceMs)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [markdown, debounceMs])

  return result
}
