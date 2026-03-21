import { useState } from "react"
import { relaunch } from "@tauri-apps/plugin-process"
import { useTranslation } from "react-i18next"
import { useNavigate } from "@tanstack/react-router"
import { Download, X, Loader2, CheckCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { UpdateInfo } from "@/hooks/use-auto-update-check"

type Status = "idle" | "downloading" | "ready" | "error"

/**
 * Bottom banner notification shown when a new version is available.
 * Displays version number, release notes, and download/install actions.
 */
export function UpdateNotification({ info, onDismiss }: { info: UpdateInfo; onDismiss: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>("idle")
  const [progress, setProgress] = useState(0)

  async function handleDownload() {
    setStatus("downloading")
    setProgress(0)
    try {
      let totalBytes = 0
      let downloadedBytes = 0

      await info.update.downloadAndInstall((event) => {
        if (event.event === "Started" && event.data.contentLength) {
          totalBytes = event.data.contentLength
        } else if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength
          if (totalBytes > 0) {
            setProgress(Math.round((downloadedBytes / totalBytes) * 100))
          }
        } else if (event.event === "Finished") {
          setProgress(100)
        }
      })
      setStatus("ready")
    } catch {
      setStatus("error")
    }
  }

  async function handleRelaunch() {
    try {
      // Persist changelog so it can be shown after restart
      localStorage.setItem("pending-changelog", JSON.stringify({
        version: info.version,
        body: info.body,
      }))
      await relaunch()
    } catch {
      setStatus("error")
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-border bg-background shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <p className="text-sm font-medium">
          {t("updater.available", { version: info.version })}
        </p>
        <Button variant="ghost" size="icon" className="size-6" onClick={onDismiss}>
          <X className="size-3.5" />
        </Button>
      </div>

      {/* Release notes */}
      {info.body && (
        <div className="px-3 pb-2">
          <p className="text-xs font-medium text-muted-foreground mb-1">{t("updater.whatsNew")}</p>
          <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
            {info.body}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 px-3 pb-3">
        {status === "idle" && (
          <>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => { onDismiss(); navigate({ to: "/settings" }) }}>
              <ArrowRight className="size-3" />
              {t("settings.title")}
            </Button>
            <Button variant="default" size="sm" className="h-7 text-xs gap-1" onClick={handleDownload}>
              <Download className="size-3" />
              {t("updater.downloadButton")}
            </Button>
          </>
        )}

        {status === "downloading" && (
          <div className="flex items-center gap-2">
            <Loader2 className="size-3.5 animate-spin" />
            <span className="text-xs font-mono">{t("updater.downloading", { progress })}</span>
          </div>
        )}

        {status === "ready" && (
          <Button variant="default" size="sm" className="h-7 text-xs gap-1" onClick={handleRelaunch}>
            <CheckCircle className="size-3" />
            {t("updater.relaunchButton")}
          </Button>
        )}

        {status === "error" && (
          <p className="text-xs text-destructive">{t("updater.error")}</p>
        )}
      </div>
    </div>
  )
}
