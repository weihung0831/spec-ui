import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Keyboard, Monitor, Globe, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useSettingsStore } from "@/stores/settings-store"
import { useTheme } from "@/hooks/use-theme"
import { SHORTCUT_REGISTRY } from "@/hooks/use-keyboard-shortcuts"
import type { Theme } from "@/stores/settings-store"
import type { Language } from "@/i18n"

/** Language display names */
const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "zh-TW", label: "繁體中文" },
]

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
})

function SettingsPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const fontSize = useSettingsStore((s) => s.fontSize)
  const setFontSize = useSettingsStore((s) => s.setFontSize)
  const autoSaveEnabled = useSettingsStore((s) => s.autoSaveEnabled)
  const setAutoSaveEnabled = useSettingsStore((s) => s.setAutoSaveEnabled)
  const language = useSettingsStore((s) => s.language)
  const setLanguage = useSettingsStore((s) => s.setLanguage)

  return (
    <div className="flex flex-1 flex-col gap-4 p-8 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings className="size-5" />
        <h1 className="text-xl font-semibold">{t("settings.title")}</h1>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto size-7"
          onClick={() => navigate({ to: "/editor" })}
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Language */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Globe className="size-4" />
            {t("settings.language")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("settings.language")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.languageDescription")}</p>
            </div>
            <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Monitor className="size-4" />
            {t("settings.appearance")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Theme */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("settings.theme")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.themeDescription")}</p>
            </div>
            <Select value={theme} onValueChange={(v) => setTheme(v as Theme)}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light" className="text-xs">{t("settings.light")}</SelectItem>
                <SelectItem value="dark" className="text-xs">{t("settings.dark")}</SelectItem>
                <SelectItem value="system" className="text-xs">{t("settings.system")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Font size */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("settings.editorFontSize")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.fontSizeCurrent", { size: fontSize })}</p>
            </div>
            <Select value={String(fontSize)} onValueChange={(v) => setFontSize(Number(v))}>
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[12, 13, 14, 15, 16, 18, 20].map((s) => (
                  <SelectItem key={s} value={String(s)} className="text-xs">{s}px</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Auto-save */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("settings.autoSave")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.autoSaveDescription")}</p>
            </div>
            <Select
              value={autoSaveEnabled ? "on" : "off"}
              onValueChange={(v) => setAutoSaveEnabled(v === "on")}
            >
              <SelectTrigger className="w-20 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on" className="text-xs">{t("settings.on")}</SelectItem>
                <SelectItem value="off" className="text-xs">{t("settings.off")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Keyboard shortcuts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Keyboard className="size-4" />
            {t("settings.keyboardShortcuts")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-0">
          {SHORTCUT_REGISTRY.map((entry, i) => (
            <div key={entry.key}>
              {i > 0 && <Separator />}
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">
                  {t(entry.i18nKey)}
                </span>
                <kbd className="px-2 py-0.5 text-xs font-mono bg-muted rounded border border-border">
                  {entry.displayKey}
                </kbd>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* App info */}
      <Card>
        <CardContent className="py-3">
          <p className="text-xs text-muted-foreground">
            {t("settings.appVersion")}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
