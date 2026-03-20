import { useEffect, useRef, useState, type RefObject } from "react"
import { createPortal } from "react-dom"
import { invoke } from "@tauri-apps/api/core"
import { useTranslation } from "react-i18next"
import type { CoverageResult, CoverageStatus } from "@/types/coverage-types"
import { useCoverageStore } from "@/stores/coverage-store"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CoverageDetailPopupProps {
  result: CoverageResult
  badgeRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
}

const STATUS_KEY: Record<CoverageStatus, string> = {
  implemented: "coverage.implemented",
  partial: "coverage.partial",
  notImplemented: "coverage.notImplemented",
  unknown: "coverage.unknown",
}

const STATUS_COLOR: Record<CoverageStatus, string> = {
  implemented: "text-green-500",
  partial: "text-yellow-500",
  notImplemented: "text-red-500",
  unknown: "text-muted-foreground",
}

export function CoverageDetailPopup({ result, badgeRef, onClose }: CoverageDetailPopupProps) {
  const { t } = useTranslation()
  const { status, confidence, reasoning, matchedFiles } = result
  const ref = useRef<HTMLDivElement>(null)
  const codePath = useCoverageStore((s) => s.report?.codePath ?? "")
  const [pos, setPos] = useState({ top: 0, left: 0 })

  // Recalculate position from badge — on mount AND on scroll
  useEffect(() => {
    const badge = badgeRef.current
    if (!badge) return

    const update = () => {
      const rect = badge.getBoundingClientRect()
      // If badge scrolled out of view, close popup
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        onClose()
        return
      }
      const popupW = 420
      const popupH = 280
      setPos({
        top: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - popupH - 8)),
        left: Math.max(8, Math.min(rect.left, window.innerWidth - popupW - 8)),
      })
    }

    update()
    document.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => {
      document.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [badgeRef])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [onClose])

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[9999] w-[420px] rounded-md border border-border bg-popover shadow-xl text-xs"
      style={{ top: pos.top, left: pos.left }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border bg-muted/30 rounded-t-md">
        <div className="flex items-center gap-1.5">
          <span className={`font-semibold ${STATUS_COLOR[status]}`}>
            {t(STATUS_KEY[status])}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{confidence}%</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            {t("coverage.file", { count: matchedFiles.length })}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="size-5" onClick={onClose}>
          <X className="size-3" />
        </Button>
      </div>

      <div className="max-h-52 overflow-y-auto px-2.5 py-2 space-y-2">
        {reasoning && (() => {
          const lines = reasoning.split("\n").filter(Boolean)
          if (lines.length >= 2) {
            return (
              <div className="space-y-1.5 leading-relaxed">
                <p className="text-muted-foreground">
                  <span className="inline-block text-[10px] font-bold px-1 py-0.5 rounded bg-blue-500/20 text-blue-400 mr-1.5 align-middle">EN</span>
                  {lines[0]}
                </p>
                <p className="text-muted-foreground">
                  <span className="inline-block text-[10px] font-bold px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400 mr-1.5 align-middle">中</span>
                  {lines.slice(1).join("\n")}
                </p>
              </div>
            )
          }
          return <p className="text-muted-foreground leading-relaxed">{reasoning}</p>
        })()}

        {matchedFiles.length > 0 && (
          <div className="space-y-0.5">
            {matchedFiles.map((match, idx) => (
              <button
                key={`${match.filePath}-${idx}`}
                className="flex w-full py-0.5 font-mono text-[11px] text-blue-500 dark:text-blue-400 hover:underline text-left cursor-pointer break-all"
                title={`Open ${match.filePath}`}
                onClick={() => {
                  const absPath = match.filePath.startsWith("/")
                    ? match.filePath
                    : `${codePath}/${match.filePath}`
                  invoke("open_in_editor", { filePath: absPath }).catch(console.warn)
                }}
              >
                {match.filePath}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
