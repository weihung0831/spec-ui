import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { check, type Update } from "@tauri-apps/plugin-updater"
import { getLocalizedNotes } from "@/lib/localized-notes"

export interface UpdateInfo {
  version: string
  body: string
  update: Update
}

/**
 * Automatically checks for updates on mount.
 * Returns update info if a new version is available, null otherwise.
 * Silently swallows errors (network offline, timeout, etc.).
 */
export function useAutoUpdateCheck() {
  const { i18n } = useTranslation()
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false

    const doCheck = async () => {
      try {
        const update = await check()
        if (!cancelled && update) {
          setUpdateInfo({
            version: update.version,
            body: getLocalizedNotes(update.body ?? "", i18n.language),
            update,
          })
        }
      } catch {
        // Silently ignore — user can still manually check in Settings
      }
    }

    // Delay 3s after app launch to avoid blocking startup
    const timer = setTimeout(doCheck, 3000)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  return {
    updateInfo: dismissed ? null : updateInfo,
    dismiss: () => setDismissed(true),
  }
}
