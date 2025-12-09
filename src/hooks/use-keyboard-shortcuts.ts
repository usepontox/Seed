import { useEffect, useCallback } from 'react';

export interface KeyboardShortcuts {
    onCPF?: () => void;
    onDeleteLast?: () => void;
    onProductManual?: () => void;
    onFinish?: () => void;
    onCancel?: () => void;
    onEscape?: () => void;
    onToggle?: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts) {
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        // Ignore if typing in an input
        if (
            event.target instanceof HTMLInputElement ||
            event.target instanceof HTMLTextAreaElement ||
            event.target instanceof HTMLSelectElement
        ) {
            return;
        }

        switch (event.key) {
            case 'F2':
                event.preventDefault();
                shortcuts.onCPF?.();
                break;
            case 'F3':
                event.preventDefault();
                shortcuts.onDeleteLast?.();
                break;
            case 'F4':
                event.preventDefault();
                shortcuts.onProductManual?.();
                break;
            case 'F9':
                event.preventDefault();
                shortcuts.onFinish?.();
                break;
            case 'F10':
                event.preventDefault();
                shortcuts.onToggle?.();
                break;
            case 'Escape':
                event.preventDefault();
                shortcuts.onEscape?.();
                break;
        }
    }, [shortcuts]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}
