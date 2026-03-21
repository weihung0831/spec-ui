import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { getVersion } from "@tauri-apps/api/app"
import { CheckCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getLocalizedNotes } from "@/lib/localized-notes"

interface ChangelogData {
  version: string
  body: string
}

const VERSION_KEY = "last-known-version"
const PENDING_KEY = "pending-changelog"

/**
 * Dialog shown after app version changes (i.e. after an update).
 * Priority: reads pending-changelog from localStorage (saved by UpdateNotification
 * before relaunch). Falls back to version comparison via last-known-version.
 */
export function PostUpdateChangelog() {
  const { t, i18n } = useTranslation()
  const [data, setData] = useState<ChangelogData | null>(null)

  useEffect(() => {
    const detect = async () => {
      const currentVersion = await getVersion()
      const lastVersion = localStorage.getItem(VERSION_KEY)

      // Always update stored version
      localStorage.setItem(VERSION_KEY, currentVersion)

      // Check for pending changelog saved by UpdateNotification before relaunch
      const pending = localStorage.getItem(PENDING_KEY)
      if (pending) {
        localStorage.removeItem(PENDING_KEY)
        try {
          const parsed = JSON.parse(pending) as ChangelogData
          if (parsed.version === currentVersion) {
            const body = getLocalizedNotes(parsed.body, i18n.language)
            setData({ version: currentVersion, body })
            return
          }
        } catch { /* ignore parse errors */ }
      }

      // Fallback: detect version change without pending data
      if (lastVersion && lastVersion !== currentVersion) {
        setData({ version: currentVersion, body: "" })
      }
    }

    const timer = setTimeout(detect, 1000)
    return () => clearTimeout(timer)
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
