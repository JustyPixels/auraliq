import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchPage } from "./SearchPage";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue([]),
  convertFileSrc: vi.fn((p: string) => p),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

describe("SearchPage", () => {
  it("supports source, duration, and favorites filters and shows honest online notice", () => {
    render(<SearchPage />);

    expect(screen.getByLabelText("Filter by genre")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by duration")).toBeInTheDocument();

    const favBtn = screen.getByRole("button", { name: "Favorites Only" });
    fireEvent.click(favBtn);
    expect(favBtn).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Internet Archive" }));
    expect(screen.getByText("Online Provider Search Scheduled")).toBeInTheDocument();
    expect(screen.getByText("Milestone 8")).toBeInTheDocument();
  });
});
