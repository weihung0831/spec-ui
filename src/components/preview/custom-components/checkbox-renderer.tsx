interface CheckboxProps {
  checked?: boolean
  children?: React.ReactNode
}

/**
 * Read-only visual checkbox for GFM task list items `- [ ]` / `- [x]`.
 */
export function CheckboxRenderer({ checked, children }: CheckboxProps) {
  return (
    <li className="flex items-start gap-2 list-none">
      <span
        className={[
          "mt-0.5 flex-shrink-0 size-4 rounded border flex items-center justify-center text-xs",
          checked
            ? "bg-primary border-primary text-primary-foreground"
            : "border-border bg-background",
        ].join(" ")}
        aria-label={checked ? "checked" : "unchecked"}
      >
        {checked && (
          <svg viewBox="0 0 10 8" className="size-2.5 fill-current">
            <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className={checked ? "line-through text-muted-foreground" : ""}>{children}</span>
    </li>
  )
}
