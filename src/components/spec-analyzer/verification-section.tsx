import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import type { TestCase, TestPriority } from "@/types/spec-analyzer-types"
import { cn } from "@/lib/utils"

interface VerificationSectionProps {
  testCases: TestCase[]
}

const PRIORITY_STYLES: Record<TestPriority, string> = {
  P0: "bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/30",
  P1: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30",
  P2: "bg-sky-500/20 text-sky-700 dark:text-sky-400 border border-sky-500/30",
}

/**
 * Renders test cases as tables grouped by functional area with colored priorities.
 */
export function VerificationSection({ testCases }: VerificationSectionProps) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)

  if (testCases.length === 0) return null

  const areaMap = new Map<string, TestCase[]>()
  for (const tc of testCases) {
    const list = areaMap.get(tc.area) ?? []
    list.push(tc)
    areaMap.set(tc.area, list)
  }

  return (
    <div id="sa-verification-section" className="space-y-1.5">
      <button
        className="flex items-center gap-1.5 text-sm font-semibold text-blue-700 dark:text-blue-400 hover:opacity-80 w-full text-left"
        onClick={() => setCollapsed((v) => !v)}
      >
        {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        {t("specAnalyzer.verificationSection")}
        <Badge className="h-5 px-2 text-[11px] bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30">
          {testCases.length}
        </Badge>
      </button>

      {!collapsed && (
        <div className="pl-2 space-y-3">
          {Array.from(areaMap.entries()).map(([area, cases]) => (
            <AreaTable key={area} area={area} cases={cases} />
          ))}
        </div>
      )}
    </div>
  )
}

function AreaTable({ area, cases }: { area: string; cases: TestCase[] }) {
  const { t } = useTranslation()
  const sorted = [...cases].sort((a, b) => {
    const order: Record<TestPriority, number> = { P0: 0, P1: 1, P2: 2 }
    return order[a.priority] - order[b.priority]
  })

  return (
    <div className="border-l-2 border-l-blue-500/60 pl-3 space-y-1">
      <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">{area}</span>
      <div className="overflow-x-auto rounded bg-muted/30">
        <table className="w-full text-xs border-collapse table-fixed">
          <colgroup>
            <col className="w-8" />
            <col className="w-[40%]" />
            <col className="w-[40%]" />
            <col className="w-14" />
          </colgroup>
          <thead>
            <tr className="border-b border-border text-muted-foreground bg-muted/50">
              <th className="text-left py-1.5 px-2">#</th>
              <th className="text-left py-1.5 px-2">{t("specAnalyzer.tableScenario")}</th>
              <th className="text-left py-1.5 px-2">{t("specAnalyzer.tableExpected")}</th>
              <th className="text-left py-1.5 px-2">{t("specAnalyzer.tablePriority")}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((tc, i) => (
              <tr key={tc.id} className="border-b border-border/30 hover:bg-muted/40 align-top">
                <td className="py-1.5 px-2 text-muted-foreground">{i + 1}</td>
                <td className="py-1.5 px-2 text-foreground break-words">{tc.scenario}</td>
                <td className="py-1.5 px-2 text-muted-foreground break-words">{tc.expectedResult || "—"}</td>
                <td className="py-1.5 px-2">
                  <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap", PRIORITY_STYLES[tc.priority])}>
                    {tc.priority}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
