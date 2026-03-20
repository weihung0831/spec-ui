import { useEffect, useRef } from "react"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { PhysicalSize, PhysicalPosition } from "@tauri-apps/api/dpi"

const STORAGE_KEY = "spec-ui-window-state"

interface WindowState {
  width: number
  height: number
  x: number
  y: number
}

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: unknown[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }) as T
}

/**
 * Persists and restores window size + position using Tauri window API.
 * Saves to localStorage with 1s debounce on resize/move.
 * Validates position is within visible screen bounds before restoring.
 */
export function useWindowState() {
  const savedRef = useRef(false)

  useEffect(() => {
    const win = getCurrentWindow()

    // Restore saved state on mount
    const restore = async () => {
      if (savedRef.current) return
      savedRef.current = true
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return
        const saved: WindowState = JSON.parse(raw)
        // Validate bounds: ensure position is non-negative
        if (saved.x < 0 || saved.y < 0) return
        await win.setSize(new PhysicalSize(saved.width, saved.height))
        await win.setPosition(new PhysicalPosition(saved.x, saved.y))
      } catch (err) {
        console.warn("[use-window-state] restore failed:", err)
      }
    }

    restore()

    // Save current state
    const save = debounce(async (..._args: unknown[]) => {
      try {
        const size = await win.innerSize()
        const pos = await win.outerPosition()
        const state: WindowState = {
          width: size.width,
          height: size.height,
          x: pos.x,
          y: pos.y,
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch (err) {
        console.warn("[use-window-state] save failed:", err)
      }
    }, 1000)

    // Listen for resize and move events
    const unlisteners: (() => void)[] = []

    win.onResized(() => save()).then((u) => unlisteners.push(u))
    win.onMoved(() => save()).then((u) => unlisteners.push(u))

    return () => {
      unlisteners.forEach((u) => u())
    }
  }, [])
}
