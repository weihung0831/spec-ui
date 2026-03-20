import { useState } from "react"
import GithubSlugger from "github-slugger"
import { useCoverageStore } from "@/stores/coverage-store"
import { CoverageBadge } from "@/components/coverage/coverage-badge"

const slugger = new GithubSlugger()

interface HeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6
  children?: React.ReactNode
}

function extractText(children: React.ReactNode): string {
  if (typeof children === "string") return children
  if (Array.isArray(children)) return children.map(extractText).join("")
  if (children && typeof children === "object" && "props" in (children as React.ReactElement)) {
    return extractText((children as React.ReactElement<{ children?: React.ReactNode }>).props.children)
  }
  return ""
}

/**
 * H1-H6 with slug anchor and hover # link icon.
 * For headings starting with "Requirement:" (case-insensitive), injects a
 * CoverageBadge inline after the heading text when a matching result exists.
 */
export function HeadingRenderer({ level, children }: HeadingProps) {
  const [hovered, setHovered] = useState(false)
  slugger.reset()
  const text = extractText(children)
  const slug = slugger.slug(text)
  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6"

  // Show coverage badge on Task/Step/Requirement headings (any level)
  const report = useCoverageStore((s) => s.report)
  const isTaskHeading = /^(task|step|requirement)\s/i.test(text.trim())
  const coverageResult = report && isTaskHeading
    ? report.results.find((r) => {
        const req = report.requirements.find((rq) => rq.id === r.requirementId)
        if (!req) return false
        const headingText = text.trim().toLowerCase()
        const reqName = req.name.trim().toLowerCase()
        return headingText === reqName || headingText.includes(reqName) || reqName.includes(headingText)
      })
    : undefined

  return (
    <Tag
      id={slug}
      className="group relative scroll-mt-4"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      {coverageResult && (
        <CoverageBadge
          status={coverageResult.status}
          confidence={coverageResult.confidence}
          result={coverageResult}
        />
      )}
      {hovered && (
        <a
          href={`#${slug}`}
          className="ml-2 text-muted-foreground opacity-60 hover:opacity-100 no-underline"
          aria-label={`Link to ${text}`}
        >
          #
        </a>
      )}
    </Tag>
  )
}
