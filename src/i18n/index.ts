import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import en from "./en.json"
import zhTW from "./zh-TW.json"

/** Supported language codes */
export type Language = "en" | "zh-TW"

/** Read persisted language from localStorage, fallback to English */
export function getStoredLanguage(): Language {
  const stored = localStorage.getItem("app-language")
  if (stored === "en" || stored === "zh-TW") return stored
  return "en"
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    "zh-TW": { translation: zhTW },
  },
  lng: getStoredLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
})

export default i18n
