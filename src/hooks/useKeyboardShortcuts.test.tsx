import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

interface HarnessProps {
  helpOpen: boolean;
  onNavigate: (section: string) => void;
  onToggleSidebar: () => void;
  onToggleQueue: () => void;
  onToggleHelp: () => void;
  onCloseHelp: () => void;
}

function ShortcutHarness(props: HarnessProps) {
  useKeyboardShortcuts(props);
  return (
    <div>
      <input aria-label="Text field" />
    </div>
  );
}

describe("useKeyboardShortcuts", () => {
  it("handles global navigation, UI shortcuts, and Escape to close help", () => {
    const onNavigate = vi.fn();
    const onToggleSidebar = vi.fn();
    const onToggleQueue = vi.fn();
    const onToggleHelp = vi.fn();
    const onCloseHelp = vi.fn();

    render(
      <ShortcutHarness
        helpOpen={true}
        onNavigate={onNavigate}
        onToggleSidebar={onToggleSidebar}
        onToggleQueue={onToggleQueue}
        onToggleHelp={onToggleHelp}
        onCloseHelp={onCloseHelp}
      />,
    );

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(onNavigate).toHaveBeenCalledWith("search");

    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(onToggleSidebar).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: ",", ctrlKey: true });
    expect(onNavigate).toHaveBeenCalledWith("settings");

    fireEvent.keyDown(window, { key: "?", shiftKey: true });
    expect(onToggleHelp).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCloseHelp).toHaveBeenCalledTimes(1);
  });

  it("ignores bare '?' shortcut when focus is inside an input", () => {
    const onToggleHelp = vi.fn();
    render(
      <ShortcutHarness
        helpOpen={false}
        onNavigate={vi.fn()}
        onToggleSidebar={vi.fn()}
        onToggleQueue={vi.fn()}
        onToggleHelp={onToggleHelp}
        onCloseHelp={vi.fn()}
      />,
    );

    const input = screen.getByLabelText("Text field");
    input.focus();
    fireEvent.keyDown(input, { key: "?", shiftKey: true });
    expect(onToggleHelp).not.toHaveBeenCalled();
  });
});
