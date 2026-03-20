interface TableProps {
  children?: React.ReactNode
}

/**
 * Styled table with horizontal scroll for wide content.
 */
export function TableRenderer({ children }: TableProps) {
  return (
    <div className="my-4 overflow-x-auto rounded-md border border-border/60 shadow-sm">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  )
}

export function TableHeadRenderer({ children }: TableProps) {
  return (
    <thead className="bg-[oklch(0.55_0.18_260/0.08)] dark:bg-[oklch(0.7_0.14_260/0.12)] text-foreground font-medium">{children}</thead>
  )
}

export function TableBodyRenderer({ children }: TableProps) {
  return <tbody className="divide-y divide-border">{children}</tbody>
}

export function TableRowRenderer({ children }: TableProps) {
  return <tr className="hover:bg-[oklch(0.6_0.1_200/0.06)] dark:hover:bg-[oklch(0.6_0.1_200/0.1)] transition-colors even:bg-muted/30">{children}</tr>
}

export function TableCellRenderer({ children }: TableProps) {
  return <td className="px-4 py-2 align-top">{children}</td>
}

export function TableHeaderCellRenderer({ children }: TableProps) {
  return <th className="px-4 py-2 text-left font-semibold">{children}</th>
}
