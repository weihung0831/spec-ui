import { create } from "zustand"
import i18n, { getStoredLanguage, type Language } from "@/i18n"

export type Theme = "light" | "dark" | "system"
type PreviewMode = "split" | "preview" | "editor"

interface SettingsState {
  theme: Theme
  sidebarWidth: number
  previewMode: PreviewMode
  fontSize: number
  autoSaveEnabled: boolean
  language: Language
  setTheme: (theme: Theme) => void
  setSidebarWidth: (width: number) => void
  setPreviewMode: (mode: PreviewMode) => void
  setFontSize: (size: number) => void
  setAutoSaveEnabled: (enabled: boolean) => void
  setLanguage: (lang: Language) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: "system",
  sidebarWidth: 260,
  previewMode: "split",
  fontSize: 14,
  autoSaveEnabled: true,
  language: getStoredLanguage(),
  setTheme: (theme) => set({ theme }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setPreviewMode: (mode) => set({ previewMode: mode }),
  setFontSize: (size) => set({ fontSize: size }),
  setAutoSaveEnabled: (enabled) => set({ autoSaveEnabled: enabled }),
  setLanguage: (language) => {
    localStorage.setItem("app-language", language)
    i18n.changeLanguage(language)
    set({ language })
  },
}))
