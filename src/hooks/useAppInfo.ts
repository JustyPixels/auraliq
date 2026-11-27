import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AppInfo } from "../types/system";

export type RuntimeStatus = "loading" | "tauri" | "browser-preview" | "error";

interface UseAppInfoResult {
  info: AppInfo | null;
  status: RuntimeStatus;
  error: string | null;
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function useAppInfo(): UseAppInfoResult {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [status, setStatus] = useState<RuntimeStatus>(() =>
    isTauriRuntime() ? "loading" : "browser-preview",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    let cancelled = false;

    invoke<AppInfo>("get_app_info")
      .then((result) => {
        if (!cancelled) {
          setInfo(result);
          setStatus("tauri");
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { info, status, error };
}
