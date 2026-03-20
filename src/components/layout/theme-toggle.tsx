import { Moon, Sun } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from "@/hooks/use-theme"

/**
 * Sun/Moon icon button that toggles between light and dark theme.
 */
export function ThemeToggle() {
  const { t } = useTranslation()
  const { resolvedTheme, toggleTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={toggleTheme}
          aria-label={isDark ? t("theme.switchToLight") : t("theme.switchToDark")}
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{isDark ? t("theme.lightMode") : t("theme.darkMode")}</TooltipContent>
    </Tooltip>
  )
}
