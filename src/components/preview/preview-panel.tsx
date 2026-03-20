import { useRef, useState, useCallback } from "react"
import { ArrowUp } from "lucide-react"
import { MarkdownRenderer } from "@/components/preview/markdown-renderer"

interface PreviewPanelProps {
  content: string
}

export function PreviewPanel({ content }: PreviewPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showTop, setShowTop] = useState(false)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setShowTop(el.scrollTop > 300)
  }, [])

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  return (
    <div ref={scrollRef} className="relative h-full w-full overflow-y-scroll" onScroll={handleScroll}>
      <MarkdownRenderer content={content} />
      {showTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-80 transition-opacity"
          aria-label="回到頂部"
        >
          <ArrowUp className="size-4" />
        </button>
      )}
    </div>
  )
}
