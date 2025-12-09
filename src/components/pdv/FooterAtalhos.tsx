export function FooterAtalhos() {
    const shortcuts = [
        { key: 'F2', label: 'CPF', color: 'text-blue-400' },
        { key: 'F3', label: 'Del', color: 'text-red-400' },
        { key: 'F4', label: 'Manual', color: 'text-yellow-400' },
        { key: 'F5', label: '🔍 Pesquisa', color: 'text-primary' },
        { key: 'F9', label: 'Finalizar', color: 'text-success' },
        { key: 'Ctrl+1-5', label: 'Pagamento', color: 'text-purple-400' },
        { key: 'ESC', label: 'Cancelar', color: 'text-orange-400' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-muted/95 backdrop-blur-sm border-t border-border z-50">
            <div className="flex items-center justify-center gap-6 px-4 py-2">
                {shortcuts.map((shortcut, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                        <kbd className="px-2 py-0.5 text-xs font-semibold bg-background border border-border rounded shadow-sm">
                            {shortcut.key}
                        </kbd>
                        <span className={`text-xs font-medium ${shortcut.color}`}>{shortcut.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
