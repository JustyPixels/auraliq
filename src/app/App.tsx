import { useEffect } from "react";
import { isTauriRuntime } from "../api/backend";
import { AppShell } from "../layouts/AppShell";
import { useLayoutStore } from "../stores/useLayoutStore";
import { useLibraryStore } from "../stores/useLibraryStore";
import { usePlayerStore } from "../stores/usePlayerStore";
import { useThemeStore } from "../stores/useThemeStore";

export function App() {
  const initTheme = useThemeStore((state) => state.initTheme);
  const applyLayoutToDocument = useLayoutStore((state) => state.applyLayoutToDocument);
  const refreshLibrary = useLibraryStore((state) => state.refreshLibrary);
  const hydratePlayer = usePlayerStore((state) => state.hydrate);

  useEffect(() => {
    initTheme();
    applyLayoutToDocument();

    if (isTauriRuntime()) {
      void refreshLibrary().then(() => {
        const tracks = useLibraryStore.getState().tracks;
        return hydratePlayer(tracks);
      });
    }
  }, [applyLayoutToDocument, hydratePlayer, initTheme, refreshLibrary]);

  return <AppShell />;
}
