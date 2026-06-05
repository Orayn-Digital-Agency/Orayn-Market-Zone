"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// size controls both the max-width and padding of the panel.
// 'sm'  — max-w-sm  (384px), p-6 — simple confirm / alert dialogs
// 'md'  — max-w-md  (448px), p-6 — compact forms (Close Deal, etc.)
// 'lg'  — max-w-lg  (512px), p-8 — full forms (Create Agent, etc.) — DEFAULT
// The maxWidth prop is kept for backward compatibility but size takes precedence
// when provided.

type ModalSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<ModalSize, { panel: string; padding: string }> = {
  sm: { panel: "max-w-sm", padding: "p-6" },
  md: { panel: "max-w-md", padding: "p-6" },
  lg: { panel: "max-w-lg", padding: "p-8" },
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: ModalSize;
  /** @deprecated Use the size prop instead. Kept for backward compatibility. */
  maxWidth?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size,
  maxWidth,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Resolve panel classes: if size is given, use SIZE_CLASSES.
  // Otherwise fall back to the legacy maxWidth prop with p-8.
  const panelMaxWidth = size
    ? SIZE_CLASSES[size].panel
    : (maxWidth ?? "max-w-lg");
  const panelPadding = size ? SIZE_CLASSES[size].padding : "p-8";

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", handleKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // Focus trap: focus the panel on open
  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.focus();
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel — overflow-y-auto + max-h prevents content from going off-screen */}
          <motion.div
            key="panel"
            ref={panelRef}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className={`relative bg-white rounded-modal shadow-modal w-full ${panelMaxWidth} ${panelPadding}
                        max-h-[90vh] overflow-y-auto focus:outline-none z-10`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2
                id="modal-title"
                className="font-sora text-xl font-bold text-orayn-navy"
              >
                {title}
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg
                           text-orayn-gray hover:text-orayn-navy hover:bg-orayn-light
                           transition-colors focus:outline-none focus:ring-2 focus:ring-orayn-gold"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
