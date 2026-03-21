import { useWorkspaceStore } from "@/stores/workspace-store"
import { Sidebar } from "@/components/layout/sidebar"
import { ContentArea } from "@/components/layout/content-area"
import { ResizableHandle } from "@/components/layout/resizable-panel"
import { useWorkspacePersistence } from "@/hooks/use-workspace-persistence"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useAutoUpdateCheck } from "@/hooks/use-auto-update-check"
import { UpdateNotification } from "@/components/updater/update-notification"

const COLLAPSED_WIDTH = 40

/**
 * Root 2-column layout: collapsible sidebar + content area.
 * Sidebar width is draggable via ResizableHandle.
 * Loads/saves workspace state via useWorkspacePersistence.
 */
export function AppLayout() {
  useWorkspacePersistence()

  const sidebarWidth = useWorkspaceStore((s) => s.sidebarWidth)
  const sidebarCollapsed = useWorkspaceStore((s) => s.sidebarCollapsed)
  const setSidebarWidth = useWorkspaceStore((s) => s.setSidebarWidth)
  const { updateInfo, dismiss } = useAutoUpdateCheck()

  const effectiveWidth = sidebarCollapsed ? COLLAPSED_WIDTH : sidebarWidth

  return (
    <TooltipProvider>
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <div
        style={{ width: effectiveWidth, minWidth: effectiveWidth, maxWidth: effectiveWidth }}
        className="flex flex-col h-full transition-[width] duration-150"
      >
        <Sidebar />
      </div>

      {/* Drag handle — hidden when collapsed */}
      {!sidebarCollapsed && (
        <ResizableHandle
          onWidthChange={setSidebarWidth}
        />
      )}

      {/* Content area */}
      <ContentArea />

      {/* Auto update notification */}
      {updateInfo && <UpdateNotification info={updateInfo} onDismiss={dismiss} />}
    </div>
    </TooltipProvider>
  )
}
