/**
 * Anti-Cheating & Integrity Guard
 * Comprehensive protection against copy, cut, paste, right-click, text selection,
 * drag-and-drop, and developer shortcuts during the examination.
 */

export type AntiCheatViolationType = 
  | "COPY" 
  | "CUT" 
  | "PASTE" 
  | "CONTEXT_MENU" 
  | "SELECT_ALL" 
  | "SHORTCUT_BLOCKED" 
  | "DRAG_DROP";

export interface AntiCheatViolation {
  id: string;
  type: AntiCheatViolationType;
  message: string;
  timestamp: Date;
}

type ViolationListener = (violation: AntiCheatViolation) => void;

const listeners: Set<ViolationListener> = new Set();

export function subscribeToAntiCheatViolations(listener: ViolationListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyViolation(type: AntiCheatViolationType, message: string) {
  const violation: AntiCheatViolation = {
    id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type,
    message,
    timestamp: new Date(),
  };
  listeners.forEach((fn) => {
    try {
      fn(violation);
    } catch (e) {
      console.error("AntiCheat listener error:", e);
    }
  });
}

/**
 * Initializes global copy, cut, paste, context menu, and keyboard shortcut prevention.
 * Returns a cleanup/teardown function.
 */
export function setupAntiCopyPasteGuard(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  // 1. Prevent Copy event
  const handleCopy = (e: ClipboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.clipboardData) {
      e.clipboardData.clearData();
    }
    notifyViolation("COPY", "Copying examination content is strictly forbidden.");
    return false;
  };

  // 2. Prevent Cut event
  const handleCut = (e: ClipboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.clipboardData) {
      e.clipboardData.clearData();
    }
    notifyViolation("CUT", "Cutting examination content is disabled.");
    return false;
  };

  // 3. Prevent Paste event
  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    notifyViolation("PASTE", "Pasting into the examination system is disabled for exam integrity.");
    return false;
  };

  // 4. Prevent Context Menu (Right Click & Mobile Long-Press)
  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    notifyViolation("CONTEXT_MENU", "Right-click and context menus are disabled during the examination.");
    return false;
  };

  // 5. Prevent Drag and Drop
  const handleDragStart = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    notifyViolation("DRAG_DROP", "Dragging content into the exam is not permitted.");
    return false;
  };

  // 6. Prevent Keyboard Shortcuts (Ctrl/Cmd + C, V, X, A, U, S, P, F12, DevTools)
  const handleKeyDown = (e: KeyboardEvent) => {
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

    // Block Copy (Ctrl/Cmd + C)
    if (isCtrlOrCmd && key === "c") {
      e.preventDefault();
      e.stopPropagation();
      notifyViolation("COPY", "Copy shortcut (Ctrl+C / Cmd+C) is disabled.");
      return false;
    }

    // Block Paste (Ctrl/Cmd + V)
    if (isCtrlOrCmd && key === "v") {
      e.preventDefault();
      e.stopPropagation();
      notifyViolation("PASTE", "Paste shortcut (Ctrl+V / Cmd+V) is disabled.");
      return false;
    }

    // Block Cut (Ctrl/Cmd + X)
    if (isCtrlOrCmd && key === "x") {
      e.preventDefault();
      e.stopPropagation();
      notifyViolation("CUT", "Cut shortcut (Ctrl+X / Cmd+X) is disabled.");
      return false;
    }

    // Block Select All (Ctrl/Cmd + A) outside of input fields if needed, or entirely
    if (isCtrlOrCmd && key === "a") {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
      if (!isInput) {
        e.preventDefault();
        e.stopPropagation();
        notifyViolation("SELECT_ALL", "Select all shortcut (Ctrl+A) is disabled.");
        return false;
      }
    }

    // Block View Source (Ctrl/Cmd + U)
    if (isCtrlOrCmd && key === "u") {
      e.preventDefault();
      e.stopPropagation();
      notifyViolation("SHORTCUT_BLOCKED", "View Source shortcut is disabled.");
      return false;
    }

    // Block Print (Ctrl/Cmd + P)
    if (isCtrlOrCmd && key === "p") {
      e.preventDefault();
      e.stopPropagation();
      notifyViolation("SHORTCUT_BLOCKED", "Printing during the exam is blocked.");
      return false;
    }

    // Block Save (Ctrl/Cmd + S)
    if (isCtrlOrCmd && key === "s") {
      e.preventDefault();
      e.stopPropagation();
      notifyViolation("SHORTCUT_BLOCKED", "Saving the page is disabled.");
      return false;
    }

    // Block DevTools shortcuts (F12, Ctrl+Shift+I, Cmd+Opt+I, Ctrl+Shift+J, Ctrl+Shift+C)
    if (
      e.key === "F12" ||
      (isCtrlOrCmd && e.shiftKey && (key === "i" || key === "j" || key === "c")) ||
      (e.metaKey && e.altKey && (key === "i" || key === "j" || key === "c"))
    ) {
      e.preventDefault();
      e.stopPropagation();
      notifyViolation("SHORTCUT_BLOCKED", "Developer inspection tools are disabled.");
      return false;
    }

    // Block Insert shortcuts
    if ((e.ctrlKey && e.key === "Insert") || (e.shiftKey && e.key === "Insert")) {
      e.preventDefault();
      e.stopPropagation();
      notifyViolation("SHORTCUT_BLOCKED", "Clipboard Insert shortcut is disabled.");
      return false;
    }
  };

  // 7. Add global listeners with capturing phase so they fire before any element handler
  document.addEventListener("copy", handleCopy, true);
  document.addEventListener("cut", handleCut, true);
  document.addEventListener("paste", handlePaste, true);
  document.addEventListener("contextmenu", handleContextMenu, true);
  document.addEventListener("dragstart", handleDragStart, true);
  document.addEventListener("drop", handleDrop, true);
  window.addEventListener("keydown", handleKeyDown, true);

  // Return cleanup
  return () => {
    document.removeEventListener("copy", handleCopy, true);
    document.removeEventListener("cut", handleCut, true);
    document.removeEventListener("paste", handlePaste, true);
    document.removeEventListener("contextmenu", handleContextMenu, true);
    document.removeEventListener("dragstart", handleDragStart, true);
    document.removeEventListener("drop", handleDrop, true);
    window.removeEventListener("keydown", handleKeyDown, true);
  };
}
