import { X } from "lucide-react";
import { SHORTCUT_DEFINITIONS, useShortcutsStore } from "../stores/useShortcutsStore";
import { Button } from "./Button";

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  const bindings = useShortcutsStore((state) => state.bindings);

  if (!open) {
    return null;
  }

  return (
    <div
      className="aq-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="aq-modal" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
        <header className="aq-modal__header">
          <h2 className="aq-panel__title">Keyboard Shortcuts</h2>
          <Button size="icon" variant="ghost" aria-label="Close shortcuts dialog" onClick={onClose}>
            <X size={16} />
          </Button>
        </header>

        <div className="aq-modal__body">
          {SHORTCUT_DEFINITIONS.map((def) => (
            <div key={def.id} className="aq-list-row">
              <span>{def.label}</span>
              <kbd className="aq-kbd">{bindings[def.id]}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
