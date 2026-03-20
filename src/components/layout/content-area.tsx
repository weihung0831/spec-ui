import { Outlet } from "@tanstack/react-router"

/**
 * Main content area that renders the current route's component.
 * Fills all remaining horizontal space after the sidebar.
 */
export function ContentArea() {
  return (
    <main className="flex flex-1 flex-col overflow-hidden min-w-0">
      <Outlet />
    </main>
  )
}
