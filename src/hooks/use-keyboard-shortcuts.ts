import { useEffect, useCallback } from 'react';

export interface KeyboardShortcuts {
    onFocusSearch?: () => void;
    onCPF?: () => void;
    onDeleteLast?: () => void;
    onProductManual?: () => void;
    onFinish?: () => void;
    onCancel?: () => void;
    onEscape?: () => void;
    onToggle?: () => void;
    onPaymentDinheiro?: () => void;
    onPaymentDebito?: () => void;
    onPaymentCredito?: () => void;
    onPaymentPix?: () => void;
    onPaymentFiado?: () => void;
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

        // Payment shortcuts with Ctrl
        if (event.ctrlKey) {
            switch (event.key) {
                case '1':
                    event.preventDefault();
                    shortcuts.onPaymentDinheiro?.();
                    break;
                case '2':
                    event.preventDefault();
                    shortcuts.onPaymentDebito?.();
                    break;
                case '3':
                    event.preventDefault();
                    shortcuts.onPaymentCredito?.();
                    break;
                case '4':
                    event.preventDefault();
                    shortcuts.onPaymentPix?.();
                    break;
                case '5':
                    event.preventDefault();
                    shortcuts.onPaymentFiado?.();
                    break;
            }
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
            case 'F5':
                event.preventDefault();
                shortcuts.onFocusSearch?.();
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
