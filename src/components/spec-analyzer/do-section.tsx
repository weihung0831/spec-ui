import { useState } from "react"
import { ChevronDown, ChevronRight, Square } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { useEditorStore } from "@/stores/editor-store"
import { useActiveProject } from "@/hooks/use-active-project"
import type { DoItem, DoCategory } from "@/types/spec-analyzer-types"

interface DoSectionProps {
  items: DoItem[]
}

/** Display order and colors for DO categories */
const CATEGORY_CONFIG: { key: DoCategory; color: string; bg: string; border: string }[] = [
  { key: "dataLayer", color: "text-violet-700 dark:text-violet-400", bg: "bg-violet-500/10", border: "border-l-violet-500" },
  { key: "backendLogic", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-500/10", border: "border-l-blue-500" },
  { key: "apiRoutes", color: "text-cyan-700 dark:text-cyan-400", bg: "bg-cyan-500/10", border: "border-l-cyan-500" },
  { key: "frontend", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-500/10", border: "border-l-amber-500" },
  { key: "integration", color: "text-teal-700 dark:text-teal-400", bg: "bg-teal-500/10", border: "border-l-teal-500" },
  { key: "other", color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-500/10", border: "border-l-gray-500" },
]

/**
 * Renders DO items grouped by category with colored left borders.
 */
export function DoSection({ items }: DoSectionProps) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)

  if (items.length === 0) return null

  const grouped = new Map<DoCategory, DoItem[]>()
  for (const item of items) {
    const list = grouped.get(item.category) ?? []
    list.push(item)
    grouped.set(item.category, list)
  }

  return (
    <div id="sa-do-section" className="space-y-1.5">
      <button
        className="flex items-center gap-1.5 text-sm font-semibold text-green-700 dark:text-green-400 hover:opacity-80 w-full text-left"
        onClick={() => setCollapsed((v) => !v)}
      >
        {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        {t("specAnalyzer.doSection")}
        <Badge className="h-5 px-2 text-[11px] bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
          {items.length}
        </Badge>
      </button>

      {!collapsed && (
        <div className="pl-2 space-y-3">
          {CATEGORY_CONFIG.map(({ key, color, bg, border }) => {
            const catItems = grouped.get(key)
            if (!catItems?.length) return null
            return (
              <CategoryGroup
                key={key}
                items={catItems}
                label={t(`specAnalyzer.category.${key}`)}
                color={color}
                bg={bg}
                border={border}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function CategoryGroup({ items, label, color, bg, border }: {
  items: DoItem[]; label: string; color: string; bg: string; border: string
}) {
  const addTab = useEditorStore((s) => s.addTab)
  const projectPath = useActiveProject()?.path

  function handleFileClick(relativePath: string) {
    if (!projectPath) return
    const fullPath = `${projectPath}/${relativePath}`
    addTab(fullPath)
  }

  return (
    <div className={`border-l-2 ${border} pl-3 space-y-1`}>
      <span className={`text-[11px] font-semibold ${color}`}>{label}</span>
      {items.map((item) => (
        <div key={item.id} className={`flex items-start gap-2 text-xs ${bg} rounded px-2 py-1.5 group`}
>
          <Square className={`size-3.5 mt-0.5 ${color} opacity-50 shrink-0`} />
          <div className="min-w-0">
            <span className="text-foreground">{item.description}</span>
            {item.filePath && (
              <code
                className="block mt-0.5 text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono w-fit cursor-pointer hover:underline hover:bg-emerald-500/20 transition-colors"
                onClick={() => handleFileClick(item.filePath!)}
              >
                {item.filePath}
              </code>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
