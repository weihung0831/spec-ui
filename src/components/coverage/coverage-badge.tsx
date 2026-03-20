import { useRef, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { useTranslation } from "react-i18next"
import type { CoverageStatus, CoverageResult } from "@/types/coverage-types"
import { CoverageDetailPopup } from "./coverage-detail-popup"
import { useCoverageStore, type CoverageOverride } from "@/stores/coverage-store"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"

interface CoverageBadgeProps {
  status: CoverageStatus
  confidence: number
  result?: CoverageResult
  onClick?: () => void
}

function getStatusEmoji(status: CoverageStatus, confidence: number): string {
  if (status === "implemented" && confidence >= 70) return "✅"
  if (status === "partial" || (status === "implemented" && confidence < 70)) return "⚠️"
  if (status === "notImplemented") return "❌"
  return "❓"
}

function getBadgeColor(status: CoverageStatus, confidence: number): string {
  if (status === "implemented" && confidence >= 70) {
    return "bg-green-100 text-green-800 border-green-300 hover:bg-green-200"
  }
  if (status === "partial" || (status === "implemented" && confidence < 70)) {
    return "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200"
  }
  if (status === "notImplemented") {
    return "bg-red-100 text-red-800 border-red-300 hover:bg-red-200"
  }
  return "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200"
}

function getOverrideBadgeColor(overrideStatus: string): string {
  if (overrideStatus === "implemented") {
    return "bg-green-100 text-green-800 border-green-300 hover:bg-green-200"
  }
  if (overrideStatus === "notImplemented") {
    return "bg-red-100 text-red-800 border-red-300 hover:bg-red-200"
  }
  return "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200"
}

function getOverrideEmoji(overrideStatus: string): string {
  if (overrideStatus === "implemented") return "✅"
  if (overrideStatus === "notImplemented") return "❌"
  return "❓"
}

/**
 * Small inline badge showing coverage status and confidence score.
 * Left-click opens a detail popup with reasoning and matched files.
 * Right-click opens a context menu to manually override the status.
 * When an override is active, a lock icon is shown on the badge.
 */
export function CoverageBadge({ status, confidence, result, onClick }: CoverageBadgeProps) {
  const { t } = useTranslation()
  const [popupOpen, setPopupOpen] = useState(false)
  const badgeRef = useRef<HTMLButtonElement>(null)
  const applyOverride = useCoverageStore((s) => s.applyOverride)
  const removeOverride = useCoverageStore((s) => s.removeOverride)
  const overrides = useCoverageStore((s) => s.overrides)
  const lastCodePath = useCoverageStore((s) => s.lastCodePath)

  const requirementId = result?.requirementId ?? null
  const activeOverride: CoverageOverride | undefined =
    requirementId ? overrides[requirementId] : undefined

  // Effective display values — override takes precedence
  const displayStatus = activeOverride
    ? (activeOverride.status as CoverageStatus)
    : status
  const displayConfidence = activeOverride ? 100 : confidence
  const emoji = activeOverride
    ? getOverrideEmoji(activeOverride.status)
    : getStatusEmoji(status, confidence)
  const colorClass = activeOverride
    ? getOverrideBadgeColor(activeOverride.status)
    : getBadgeColor(status, confidence)

  const statusLabel = t(`coverage.${displayStatus}`)
  const badgeTitle = activeOverride
    ? t("coverage.badgeTitleOverride", { status: statusLabel, confidence: displayConfidence })
    : t("coverage.badgeTitle", { status: statusLabel, confidence: displayConfidence })

  function handleClick() {
    if (result) setPopupOpen(true)
    onClick?.()
  }

  async function handleOverride(newStatus: string) {
    if (!requirementId) return
    const override: CoverageOverride = {
      status: newStatus,
      note: "manually overridden",
      overriddenAt: new Date().toISOString(),
    }
    applyOverride(requirementId, override)

    // Persist to cache if we have a code path
    if (lastCodePath) {
      try {
        await invoke("save_coverage_override", {
          codePath: lastCodePath,
          requirementId,
          status: newStatus,
          note: "manually overridden",
        })
      } catch (err) {
        console.warn("[coverage-badge] Failed to persist override:", err)
      }
    }
  }

  async function handleResetOverride() {
    if (!requirementId) return
    removeOverride(requirementId)
  }

  const badge = (
    <button
      ref={badgeRef}
      onClick={handleClick}
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-xs font-mono cursor-pointer transition-colors ml-2 ${colorClass}`}
      title={badgeTitle}
      aria-label={t("coverage.badgeAriaLabel", { status: statusLabel, confidence: displayConfidence })}
    >
      <span>{emoji}</span>
      {activeOverride && <span className="text-xs">🔒</span>}
      <span>{activeOverride ? t("coverage.manual") : `${confidence}%`}</span>
    </button>
  )

  const popup = result && popupOpen
    ? <CoverageDetailPopup result={result} badgeRef={badgeRef} onClose={() => setPopupOpen(false)} />
    : null

  if (!requirementId) {
    return (
      <>
        {badge}
        {popup}
      </>
    )
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{badge}</ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={() => handleOverride("implemented")}>
            ✅ {t("coverage.markImplemented")}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleOverride("notImplemented")}>
            ❌ {t("coverage.markNotImplemented")}
          </ContextMenuItem>
          {activeOverride && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={handleResetOverride}>
                🔄 {t("coverage.resetToAuto")}
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
      {popup}
    </>
  )
}
