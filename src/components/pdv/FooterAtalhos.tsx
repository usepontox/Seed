export function FooterAtalhos() {
    const atalhos = [
        { key: 'F2', desc: 'CPF' },
        { key: 'F3', desc: 'Del' },
        { key: 'F4', desc: 'Manual' },
        { key: 'F9', desc: 'Finalizar' },
        { key: 'Ctrl+1-5', desc: 'Pagamento' },
        { key: 'ESC', desc: 'Cancelar' },
    ];

    return (
        <div className="border-t border-border/50 bg-muted/30 px-4 py-2">
            <div className="flex items-center justify-center gap-6 flex-wrap">
                {atalhos.map((atalho) => (
                    <div key={atalho.key} className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-background rounded text-xs font-mono border border-border text-primary">
                            {atalho.key}
                        </kbd>
                        <span className="text-xs text-muted-foreground">{atalho.desc}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
