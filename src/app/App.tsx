import { useEffect } from "react";
import { AppShell } from "../layouts/AppShell";
import { useThemeStore } from "../stores/useThemeStore";

export function App() {
  const initTheme = useThemeStore((state) => state.initTheme);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return <AppShell />;
}
