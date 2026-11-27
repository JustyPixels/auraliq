import { listen } from "@tauri-apps/api/event";
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
  const refreshAudioDevices = usePlayerStore((state) => state.refreshAudioDevices);

  useEffect(() => {
    initTheme();
    applyLayoutToDocument();

    if (!isTauriRuntime()) {
      return;
    }

    void refreshAudioDevices();
    void refreshLibrary().then(() => {
      const tracks = useLibraryStore.getState().tracks;
      return hydratePlayer(tracks);
    });

    let unlisten: (() => void) | undefined;
    void listen<string>("auraliq://media-control", (event) => {
      const player = usePlayerStore.getState();
      switch (event.payload) {
        case "play":
          if (player.status !== "playing") {
            void player.togglePlayPause();
          }
          break;
        case "pause":
          if (player.status === "playing") {
            void player.togglePlayPause();
          }
          break;
        case "toggle":
          void player.togglePlayPause();
          break;
        case "next":
          void player.nextTrack();
          break;
        case "previous":
          void player.prevTrack();
          break;
        case "stop":
          void player.stopPlayback();
          break;
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [applyLayoutToDocument, hydratePlayer, initTheme, refreshAudioDevices, refreshLibrary]);

  return <AppShell />;
}
