import { useEffect, useRef, useState } from "react"
import mermaid from "mermaid"
import { cn } from "@/lib/utils"

interface MermaidDiagramProps {
  code: string
  isDark?: boolean
}

let idCounter = 0

/**
 * Renders a Mermaid diagram from a markdown code block.
 * Uses mermaid.render() to produce sanitized SVG.
 * Falls back to raw code + error on parse failure.
 */
export function MermaidDiagram({ code, isDark = false }: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const idRef = useRef(`mermaid-${++idCounter}`)

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? "dark" : "default",
      securityLevel: "strict",
    })

    let cancelled = false

    const render = async () => {
      try {
        const { svg: renderedSvg } = await mermaid.render(idRef.current, code)
        if (!cancelled) {
          setSvg(renderedSvg)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
          setSvg(null)
        }
      }
    }

    render()
    return () => { cancelled = true }
  }, [code, isDark])

  if (error) {
    return (
      <div className="my-4 rounded-md border border-destructive/50 overflow-hidden">
        <div className="bg-destructive/10 px-3 py-1.5 text-xs text-destructive font-mono">
          Mermaid parse error: {error}
        </div>
        <pre className="overflow-x-auto p-4 text-sm font-mono">{code}</pre>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className={cn("my-4 flex items-center justify-center py-8 text-sm text-muted-foreground rounded-md border border-border bg-muted/30")}>
        Loading diagram...
      </div>
    )
  }

  return (
    <div
      className="my-4 flex justify-center overflow-x-auto rounded-md border border-border bg-background p-4"
      // mermaid.render() output is sanitized (securityLevel: strict)
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
