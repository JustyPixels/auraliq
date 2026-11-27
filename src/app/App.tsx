import { useEffect } from "react";
import { AppShell } from "../layouts/AppShell";
import { useLayoutStore } from "../stores/useLayoutStore";
import { useThemeStore } from "../stores/useThemeStore";

export function App() {
  const initTheme = useThemeStore((state) => state.initTheme);
  const applyLayoutToDocument = useLayoutStore((state) => state.applyLayoutToDocument);

  useEffect(() => {
    initTheme();
    applyLayoutToDocument();
  }, [applyLayoutToDocument, initTheme]);

  return <AppShell />;
}
