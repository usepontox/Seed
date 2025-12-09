import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SeletorPagamentoProps {
    formaPagamento: string;
    onSelect: (forma: string) => void;
}

const formasPagamento = [
    { value: 'dinheiro', label: 'Dinheiro', emoji: '💵', color: 'success' },
    { value: 'debito', label: 'Débito', emoji: '💳', color: 'blue' },
    { value: 'credito', label: 'Crédito', emoji: '💳', color: 'blue' },
    { value: 'pix', label: 'PIX', emoji: '📱', color: 'primary' },
    { value: 'fiado', label: 'Fiado', emoji: '📝', color: 'orange' },
];

export function SeletorPagamento({ formaPagamento, onSelect }: SeletorPagamentoProps) {
    return (
        <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Forma de Pagamento
            </label>
            <div className="grid grid-cols-2 gap-2">
                {formasPagamento.map((forma) => {
                    const isSelected = formaPagamento === forma.value;
                    return (
                        <Button
                            key={forma.value}
                            variant={isSelected ? 'default' : 'outline'}
                            onClick={() => onSelect(forma.value)}
                            className={cn(
                                'h-12 justify-start gap-2 transition-all duration-200',
                                isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                                !isSelected && 'hover:border-primary/50'
                            )}
                        >
                            <span className="text-lg">{forma.emoji}</span>
                            <span className="text-sm font-medium">{forma.label}</span>
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}
