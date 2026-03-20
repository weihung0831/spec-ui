import CodeMirror from "@uiw/react-codemirror"
import { markdown } from "@codemirror/lang-markdown"
import { lineNumbers, highlightActiveLine } from "@codemirror/view"
import { indentOnInput } from "@codemirror/language"

interface CodeMirrorEditorProps {
  value: string
  onChange: (value: string) => void
  isDark?: boolean
}

export function CodeMirrorEditor({ value, onChange, isDark = false }: CodeMirrorEditorProps) {
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme={isDark ? "dark" : "light"}
      extensions={[
        markdown(),
        lineNumbers(),
        highlightActiveLine(),
        indentOnInput(),
      ]}
      basicSetup={false}
      className="h-full overflow-auto text-sm font-mono"
      style={{ height: "100%" }}
    />
  )
}
