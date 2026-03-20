import { Suspense, lazy, useState } from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Lazy-load mermaid only when a mermaid code block is encountered (~2MB)
const MermaidDiagram = lazy(() =>
  import("@/components/preview/custom-components/mermaid-diagram").then((m) => ({
    default: m.MermaidDiagram,
  })),
)

interface CodeBlockProps {
  className?: string
  children?: React.ReactNode
  isBlock?: boolean
}

/** Extract text content recursively from React children */
function extractText(children: React.ReactNode): string {
  if (typeof children === "string") return children
  if (typeof children === "number") return String(children)
  if (Array.isArray(children)) return children.map(extractText).join("")
  if (children && typeof children === "object" && "props" in children) {
    return extractText((children as React.ReactElement<{ children?: React.ReactNode }>).props.children)
  }
  return ""
}

/** Extract language from nested <code className="language-xxx"> inside <pre> */
function extractLanguage(children: React.ReactNode): string {
  if (Array.isArray(children)) {
    for (const child of children) {
      const lang = extractLanguage(child)
      if (lang) return lang
    }
  }
  if (children && typeof children === "object" && "props" in children) {
    const el = children as React.ReactElement<{ className?: string; children?: React.ReactNode }>
    const match = /language-(\w+)/.exec(el.props.className ?? "")
    if (match) return match[1]
  }
  return ""
}

/** Strip leading/trailing newline-only text nodes from React children */
function trimChildWhitespace(node: React.ReactNode): React.ReactNode {
  if (!node || typeof node !== "object" || !("props" in node)) return node
  const el = node as React.ReactElement<{ children?: React.ReactNode }>
  const kids = el.props.children
  if (!kids) return node

  const arr = Array.isArray(kids) ? [...kids] : [kids]
  // Trim leading whitespace-only text nodes
  while (arr.length > 0 && typeof arr[0] === "string" && arr[0].trim() === "") {
    arr.shift()
  }
  // Trim leading newline from first text node
  if (arr.length > 0 && typeof arr[0] === "string") {
    arr[0] = arr[0].replace(/^\n/, "")
  }
  // Trim trailing whitespace-only text nodes
  while (arr.length > 0 && typeof arr[arr.length - 1] === "string" && (arr[arr.length - 1] as string).trim() === "") {
    arr.pop()
  }
  // Trim trailing newline from last text node
  if (arr.length > 0 && typeof arr[arr.length - 1] === "string") {
    arr[arr.length - 1] = (arr[arr.length - 1] as string).replace(/\n$/, "")
  }

  // Clone element with trimmed children
  const { children: _, ...restProps } = el.props as Record<string, unknown>
  return { ...el, props: { ...restProps, children: arr.length === 1 ? arr[0] : arr } }
}

/**
 * Renders fenced code blocks with copy button + language label.
 * Called from `pre` mapping in the processor with isBlock=true.
 */
export function CodeBlockRenderer({ children, isBlock }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  if (!isBlock) return <pre>{children}</pre>

  const textContent = extractText(children).trim()
  const language = extractLanguage(children)
  // Trim leading/trailing newlines from code element to avoid blank first line
  const trimmedChildren = trimChildWhitespace(children)

  // Render mermaid diagrams using the lazy-loaded component
  if (language === "mermaid") {
    return (
      <Suspense
        fallback={
          <div className="my-4 flex items-center justify-center py-8 text-sm text-muted-foreground rounded-md border border-border bg-muted/30">
            Loading diagram...
          </div>
        }
      >
        <MermaidDiagram code={textContent} />
      </Suspense>
    )
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard not available
    }
  }

  return (
    <div className="group relative my-4 rounded-md border border-border/60 overflow-hidden shadow-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-[oklch(0.55_0.15_260/0.08)] dark:bg-[oklch(0.6_0.12_260/0.15)] px-3 py-1.5 text-xs border-b border-border/60">
        <span className="font-mono font-semibold text-[oklch(0.5_0.15_260)] dark:text-[oklch(0.78_0.12_260)]">{language || "text"}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className={cn("h-6 px-2 text-xs gap-1")}
          aria-label="Copy code"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      {/* Code content — no whitespace between pre and children to avoid leading space */}
      <pre className="overflow-x-auto p-4 text-sm bg-muted/30">{trimmedChildren}</pre>
    </div>
  )
}
