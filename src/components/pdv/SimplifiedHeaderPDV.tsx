import { Clock } from 'lucide-react';
import { useCaixa } from '@/hooks/use-caixa';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

export function SimplifiedHeaderPDV() {
    const { caixaAtual } = useCaixa();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [operadorNome, setOperadorNome] = useState<string>('');

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const getOperador = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) {
                setOperadorNome(user.email.split('@')[0].toUpperCase());
            }
        };
        getOperador();
    }, []);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="bg-muted/30 border-b border-border px-4 py-2">
            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">Operador:</span>
                    <span className="font-medium">{operadorNome}</span>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">Caixa #{caixaAtual?.id ? caixaAtual.id.slice(0, 8) : '—'}</span>
                </div>

                <div className="flex items-center gap-4">
                    {caixaAtual && (
                        <span className="text-success font-medium">Caixa Aberto</span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="font-mono font-bold text-primary tabular-nums">
                        {formatTime(currentTime)}
                    </span>
                </div>

                <span className="text-muted-foreground">Header</span>
            </div>
        </div>
    );
}
