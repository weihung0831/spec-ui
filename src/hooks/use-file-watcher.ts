import { useEffect, useRef } from "react"
import { listen } from "@tauri-apps/api/event"

export type FileChangeKind = "create" | "modify" | "remove" | "unknown"

/** Matches the Rust struct with #[serde(rename_all = "camelCase")] */
export interface FileChangedPayload {
  path: string
  eventType: FileChangeKind
}

interface UseFileWatcherOptions {
  /** Called when a watched file is modified externally */
  onModify?: (payload: FileChangedPayload) => void
  /** Called when a file is created or deleted (use to refresh file tree) */
  onCreateOrDelete?: (payload: FileChangedPayload) => void
}

/**
 * Listens to `file-changed` events emitted by the Tauri backend watcher.
 * Debounces handler 500ms to avoid event storms.
 * Cleans up listener on unmount.
 */
export function useFileWatcher(options: UseFileWatcherOptions = {}) {
  const { onModify, onCreateOrDelete } = options
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let unlisten: (() => void) | undefined

    const setup = async () => {
      try {
        unlisten = await listen<FileChangedPayload>("file-changed", (event) => {
          const payload = event.payload

          // Debounce: clear previous timer and set a new one
          if (debounceRef.current) clearTimeout(debounceRef.current)

          debounceRef.current = setTimeout(() => {
            if (payload.eventType === "modify") {
              console.log("[file-watcher] file modified:", payload.path)
              onModify?.(payload)
            } else if (payload.eventType === "create" || payload.eventType === "remove") {
              console.log("[file-watcher] file created/removed:", payload.path, payload.eventType)
              onCreateOrDelete?.(payload)
            }
          }, 500)
        })
      } catch (err) {
        // Backend may not be running in dev mode — silent fail
        console.warn("[file-watcher] could not set up listener:", err)
      }
    }

    setup()

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      unlisten?.()
    }
  }, [onModify, onCreateOrDelete])
}
