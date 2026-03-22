import { getCurrentWindow, currentMonitor, LogicalSize, LogicalPosition } from "@tauri-apps/api/window"
import { useWorkspaceStore } from "@/stores/workspace-store"

const COMPACT_WIDTH = 480
const COMPACT_HEIGHT = 360
const STORAGE_KEY = "spec-ui-pre-compact-state"

/**
 * Saves current window state and shrinks to compact size at top-right corner.
 */
export async function enterCompactMode() {
  try {
    const win = getCurrentWindow()
    const store = useWorkspaceStore.getState()
    const factor = await win.scaleFactor()

    // Save current size/position in logical pixels
    const size = await win.innerSize()
    const pos = await win.outerPosition()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      width: Math.round(size.width / factor),
      height: Math.round(size.height / factor),
      x: Math.round(pos.x / factor),
      y: Math.round(pos.y / factor),
      sidebarCollapsed: store.sidebarCollapsed,
    }))

    store.setSidebarCollapsed(true)
    store.setCompactWindow(true)
    await win.setSize(new LogicalSize(COMPACT_WIDTH, COMPACT_HEIGHT))

    const monitor = await currentMonitor()
    if (monitor) {
      const screenW = Math.round(monitor.size.width / factor)
      await win.setPosition(new LogicalPosition(screenW - COMPACT_WIDTH, 0))
    }
  } catch (err) {
    console.error("[compact-window] enter failed:", err)
  }
}

/**
 * Restores window to saved size/position.
 */
export async function exitCompactMode() {
  const store = useWorkspaceStore.getState()
  const raw = localStorage.getItem(STORAGE_KEY)
  const saved = raw ? JSON.parse(raw) : null
  if (saved) {
    store.setSidebarCollapsed(saved.sidebarCollapsed)
  }
  store.setCompactWindow(false)

  try {
    if (saved) {
      const win = getCurrentWindow()
      await win.setSize(new LogicalSize(saved.width, saved.height))
      await win.setPosition(new LogicalPosition(saved.x, saved.y))
    }
  } catch (err) {
    console.error("[compact-window] restore failed:", err)
  }
}

/** Toggles always-on-top (pin) for the window. */
export async function toggleAlwaysOnTop() {
  try {
    const store = useWorkspaceStore.getState()
    const next = !store.isPinned
    const win = getCurrentWindow()
    await win.setAlwaysOnTop(next)
    store.setPinned(next)
  } catch (err) {
    console.error("[compact-window] pin failed:", err)
  }
}
