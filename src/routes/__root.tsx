import { createRootRoute } from "@tanstack/react-router"
import { AppLayout } from "@/components/layout/app-layout"
import { useTheme } from "@/hooks/use-theme"
import { useWindowState } from "@/hooks/use-window-state"

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  // Initialize theme from localStorage and apply dark class
  useTheme()
  // Persist and restore window size/position
  useWindowState()

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <AppLayout />
    </div>
  )
}
