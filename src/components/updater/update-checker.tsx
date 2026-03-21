import { useState, useRef } from "react"
import { check, type Update } from "@tauri-apps/plugin-updater"
import { relaunch } from "@tauri-apps/plugin-process"
import { useTranslation } from "react-i18next"
import { Download, CheckCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type UpdateStatus = "idle" | "checking" | "available" | "downloading" | "ready" | "upToDate" | "error"

/** Race a promise against a timeout, cleaning up the timer on resolution. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>
  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("timeout")), ms)
    }),
  ])
}

/**
 * Inline update checker for the settings page.
 * Checks GitHub releases for new versions, downloads and installs updates.
 * Shows release notes (body) from GitHub Release when an update is available.
 */
export function UpdateChecker() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<UpdateStatus>("idle")
  const [progress, setProgress] = useState<number>(0)
  const [newVersion, setNewVersion] = useState<string>("")
  const [releaseNotes, setReleaseNotes] = useState<string>("")
  const updateRef = useRef<Update | null>(null)
  const progressRef = useRef(0)

  async function handleCheckUpdate() {
    setStatus("checking")

    try {
      const update = await withTimeout(check(), 10_000)

      if (!update) {
        setStatus("upToDate")
        return
      }

      updateRef.current = update
      setNewVersion(update.version)
      setReleaseNotes(update.body ?? "")
      setStatus("available")
    } catch {
      setStatus("upToDate")
    }
  }

  async function handleDownloadAndInstall() {
    const update = updateRef.current
    if (!update) return

    setStatus("downloading")
    setProgress(0)
    progressRef.current = 0

    try {
      let totalBytes = 0
      let downloadedBytes = 0

      await update.downloadAndInstall((event) => {
        if (event.event === "Started" && event.data.contentLength) {
          totalBytes = event.data.contentLength
        } else if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength
          if (totalBytes > 0) {
            const pct = Math.round((downloadedBytes / totalBytes) * 100)
            if (pct !== progressRef.current) {
              progressRef.current = pct
              setProgress(pct)
            }
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
      await relaunch()
    } catch {
      setStatus("error")
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header row: status text + action button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{t("updater.title")}</p>
          <p className="text-xs text-muted-foreground">
            {status === "checking" && t("updater.checking")}
            {status === "upToDate" && t("updater.upToDate")}
            {status === "available" && t("updater.available", { version: newVersion })}
            {status === "downloading" && t("updater.downloading", { progress })}
            {status === "ready" && t("updater.ready")}
            {status === "error" && t("updater.error")}
            {status === "idle" && t("updater.description")}
          </p>
        </div>

        {(status === "idle" || status === "error" || status === "upToDate") && (
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleCheckUpdate}>
            <Download className="size-3.5" />
            {t("updater.checkButton")}
          </Button>
        )}

        {status === "checking" && (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        )}

        {status === "available" && (
          <Button variant="default" size="sm" className="h-8 text-xs gap-1.5" onClick={handleDownloadAndInstall}>
            <Download className="size-3.5" />
            {t("updater.downloadButton")}
          </Button>
        )}

        {status === "downloading" && (
          <div className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-xs font-mono">{progress}%</span>
          </div>
        )}

        {status === "ready" && (
          <Button variant="default" size="sm" className="h-8 text-xs gap-1.5" onClick={handleRelaunch}>
            <CheckCircle className="size-3.5" />
            {t("updater.relaunchButton")}
          </Button>
        )}
      </div>

      {/* Release notes — shown when update is available, downloading, or ready */}
      {releaseNotes && (status === "available" || status === "downloading" || status === "ready") && (
        <div className="rounded-md border border-border bg-muted/50 p-3 max-h-48 overflow-y-auto">
          <p className="text-xs font-medium mb-1.5">{t("updater.whatsNew")}</p>
          <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {releaseNotes}
          </div>
        </div>
      )}
    </div>
  )
}
