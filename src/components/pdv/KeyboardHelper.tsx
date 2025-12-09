import { cn } from "@/lib/utils";
import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";

const shortcuts = [
    { key: 'F2', label: 'CPF na Nota', color: 'text-warning' },
    { key: 'F3', label: 'Excluir Último', color: 'text-destructive' },
    { key: 'F4', label: 'Produto Manual', color: 'text-primary' },
    { key: 'F9', label: 'Finalizar Venda', color: 'text-success' },
    { key: 'ESC', label: 'Cancelar', color: 'text-muted-foreground' },
];

interface KeyboardHelperProps {
    isOpen: boolean;
    onToggle: () => void;
}

export function KeyboardHelper({ isOpen, onToggle }: KeyboardHelperProps) {
    return (
        <div className="relative">
            <Button
                variant="outline"
                size="sm"
                onClick={onToggle}
                className="h-9 px-3 gap-2"
            >
                <Keyboard className="h-4 w-4" />
                <span className="text-xs">Atalhos</span>
            </Button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 bg-card/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-primary/20 z-50 min-w-[200px]">
                    <div className="text-xs space-y-1.5">
                        <div className="font-semibold text-primary mb-2 border-b border-border pb-1">
                            ⌨️ Atalhos de Teclado
                        </div>
                        {shortcuts.map(({ key, label, color }) => (
                            <div key={key} className="flex items-center justify-between gap-3">
                                <kbd className="px-2 py-0.5 bg-muted rounded text-[10px] font-mono border border-border min-w-[32px] text-center">
                                    {key}
                                </kbd>
                                <span className={cn("text-[10px]", color)}>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
