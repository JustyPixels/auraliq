import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePlayerStore } from "../stores/usePlayerStore";
import { AudioVisualizer } from "./AudioVisualizer";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  convertFileSrc: vi.fn((p: string) => p),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

describe("AudioVisualizer", () => {
  beforeEach(() => {
    localStorage.clear();
    usePlayerStore.getState().setVisualizerStyle("bars");
    usePlayerStore.getState().setLowPerformanceVisualizer(false);
  });

  it("renders canvas and switches visualizer styles and low-performance mode", () => {
    render(<AudioVisualizer />);

    expect(screen.getByLabelText("Audio visualizer")).toBeInTheDocument();
    expect(screen.getByText("STANDBY")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Scope" }));
    expect(usePlayerStore.getState().visualizerStyle).toBe("scope");

    fireEvent.click(screen.getByRole("button", { name: "Cassette" }));
    expect(usePlayerStore.getState().visualizerStyle).toBe("cassette");

    fireEvent.click(screen.getByRole("button", { name: "VU" }));
    expect(usePlayerStore.getState().visualizerStyle).toBe("vu");

    fireEvent.click(screen.getByRole("button", { name: "Matrix" }));
    expect(usePlayerStore.getState().visualizerStyle).toBe("crt-matrix");

    fireEvent.click(screen.getByRole("button", { name: /Low-Performance Mode/i }));
    expect(usePlayerStore.getState().lowPerformanceVisualizer).toBe(true);
  });
});
