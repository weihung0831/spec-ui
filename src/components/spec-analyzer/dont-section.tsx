import { useState } from "react"
import { ChevronDown, ChevronRight, Ban } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import type { DontItem, DontCategory } from "@/types/spec-analyzer-types"

interface DontSectionProps {
  items: DontItem[]
}

const CATEGORY_CONFIG: { key: DontCategory; label: string; color: string }[] = [
  { key: "excluded", label: "excluded", color: "text-red-600 dark:text-red-400" },
  { key: "constraints", label: "constraints", color: "text-orange-600 dark:text-orange-400" },
  { key: "antiPatterns", label: "antiPatterns", color: "text-rose-600 dark:text-rose-400" },
]

/**
 * Renders DON'T items grouped by category with red-toned visuals.
 */
export function DontSection({ items }: DontSectionProps) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)

  if (items.length === 0) return null

  const grouped = new Map<DontCategory, DontItem[]>()
  for (const item of items) {
    const list = grouped.get(item.category) ?? []
    list.push(item)
    grouped.set(item.category, list)
  }

  return (
    <div id="sa-dont-section" className="space-y-1.5">
      <button
        className="flex items-center gap-1.5 text-sm font-semibold text-red-700 dark:text-red-400 hover:opacity-80 w-full text-left"
        onClick={() => setCollapsed((v) => !v)}
      >
        {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        {t("specAnalyzer.dontSection")}
        <Badge className="h-5 px-2 text-[11px] bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30">
          {items.length}
        </Badge>
      </button>

      {!collapsed && (
        <div className="pl-2 space-y-3">
          {CATEGORY_CONFIG.map(({ key, color }) => {
            const catItems = grouped.get(key)
            if (!catItems?.length) return null
            return (
              <div key={key} className="border-l-2 border-l-red-500/60 pl-3 space-y-1">
                <span className={`text-[11px] font-semibold ${color}`}>
                  {t(`specAnalyzer.category.${key}`)}
                </span>
                {catItems.map((item) => (
                  <div key={item.id} className="flex items-start gap-2 text-xs bg-red-500/5 rounded px-2 py-1.5"
>
                    <Ban className="size-3.5 mt-0.5 text-red-500/60 shrink-0" />
                    <span className="text-foreground">{item.description}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
