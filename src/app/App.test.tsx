import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { App } from "./App";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("App", () => {
  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
    vi.clearAllMocks();
  });

  it("renders title, tagline, and browser preview status outside Tauri", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Auraliq" })).toBeInTheDocument();
    expect(screen.getByText("Your music. Your frequency.")).toBeInTheDocument();
    expect(screen.getByText("Browser Preview")).toBeInTheDocument();
    expect(screen.getByText(/Milestone 1 Foundation active/i)).toBeInTheDocument();
  });

  it("loads app info over Tauri IPC when running in Tauri", async () => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    vi.mocked(invoke).mockResolvedValueOnce({
      name: "Auraliq",
      version: "0.1.0",
      platform: "windows",
      arch: "x86_64",
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Tauri IPC Connected")).toBeInTheDocument();
    });
    expect(screen.getByText("windows (x86_64)")).toBeInTheDocument();
    expect(invoke).toHaveBeenCalledWith("get_app_info");
  });
});
