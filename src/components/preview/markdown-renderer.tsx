import { useMarkdownProcessor } from "@/hooks/use-markdown-processor"

interface MarkdownRendererProps {
  content: string
}

/**
 * Renders markdown string to styled React elements via unified pipeline.
 * Applies markdown-preview prose styles.
 */
export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const rendered = useMarkdownProcessor(content)

  if (!rendered) {
    return (
      <div className="p-4 text-sm text-muted-foreground animate-pulse">
        Rendering…
      </div>
    )
  }

  return (
    <div className="markdown-preview prose prose-sm max-w-none px-6 py-4">
      {rendered}
    </div>
  )
}
