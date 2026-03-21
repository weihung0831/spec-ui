import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { getVersion } from "@tauri-apps/api/app"
import { CheckCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ChangelogData {
  version: string
  body: string
}

const STORAGE_KEY = "pending-changelog"

/**
 * Dialog shown after app restarts following an update.
 * Reads pending changelog from localStorage, displays it once,
 * then clears the storage entry.
 */
export function PostUpdateChangelog() {
  const { t } = useTranslation()
  const [data, setData] = useState<ChangelogData | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return

    const parsed: ChangelogData = JSON.parse(raw)

    // Only show if current app version matches the updated version
    getVersion().then((currentVersion) => {
      if (currentVersion === parsed.version) {
        setData(parsed)
      }
      // Always clear — stale entries should not persist
      localStorage.removeItem(STORAGE_KEY)
    })
  }, [])

  if (!data) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-96 max-h-[80vh] rounded-lg border border-border bg-background shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <CheckCircle className="size-5 text-green-500 shrink-0" />
          <h2 className="text-sm font-semibold flex-1">
            {t("updater.justUpdated", { version: data.version })}
          </h2>
          <Button variant="ghost" size="icon" className="size-6" onClick={() => setData(null)}>
            <X className="size-3.5" />
          </Button>
        </div>

        {/* Release notes */}
        {data.body && (
          <div className="px-4 pb-2 flex-1 overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">{t("updater.whatsNew")}</p>
            <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {data.body}
            </div>
          </div>
        )}

        {/* Action */}
        <div className="flex justify-end px-4 pb-4 pt-2">
          <Button variant="default" size="sm" className="h-7 text-xs" onClick={() => setData(null)}>
            {t("updater.gotIt")}
          </Button>
        </div>
      </div>
    </div>
  )
}
