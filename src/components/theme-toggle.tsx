"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Switch } from "@/components/ui/switch"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Affichez un placeholder ou rien du tout pendant le rendu serveur
    // pour éviter l'erreur d'hydratation.
    return <div className="h-6 w-11" />
  }

  return (
    <Switch
      checked={theme === 'dark'}
      onCheckedChange={(checked) => {
        setTheme(checked ? 'dark' : 'light')
      }}
      aria-label="Toggle dark mode"
    />
  )
}
