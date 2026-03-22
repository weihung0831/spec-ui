import { useEditorStore } from "@/stores/editor-store"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { useSpecAnalyzerStore } from "@/stores/spec-analyzer-store"

/**
 * Close a tab, clear analyzer state if needed, and select the last remaining tab.
 * Centralises the close-tab-then-select-next pattern used across multiple components.
 */
export function closeTabAndSelect(filePath: string) {
  // Clear analyzer if this file was being analyzed
  const report = useSpecAnalyzerStore.getState().report
  if (report?.specFile === filePath) {
    useSpecAnalyzerStore.getState().clearReport()
  }

  useEditorStore.getState().closeTab(filePath)

  // Select last remaining tab, or clear selection
  if (useWorkspaceStore.getState().selectedFilePath === filePath) {
    const remaining = useEditorStore.getState().openTabs
    useWorkspaceStore.getState().selectFile(remaining[remaining.length - 1] ?? null)
  }
}
