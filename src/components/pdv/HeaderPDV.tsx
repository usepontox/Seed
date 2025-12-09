import { useEffect, useState } from 'react';
import { Clock, User, DollarSign } from 'lucide-react';
import { useEmpresa } from '@/hooks/use-empresa';
import { useCaixa } from '@/hooks/use-caixa';
import { supabase } from '@/integrations/supabase/client';

export function HeaderPDV() {
    const { empresaId } = useEmpresa();
    const { caixaAtual } = useCaixa();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [operadorNome, setOperadorNome] = useState<string>('');
    const [nomeEmpresa, setNomeEmpresa] = useState<string>('');

    // Atualizar relógio a cada segundo
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Buscar dados da empresa
    useEffect(() => {
        const getEmpresa = async () => {
            if (!empresaId) return;

            const { data } = await supabase
                .from('empresas')
                .select('nome_fantasia, razao_social')
                .eq('id', empresaId)
                .single();

            if (data) {
                setNomeEmpresa(data.nome_fantasia || data.razao_social);
            }
        };
        getEmpresa();
    }, [empresaId]);

    // Buscar nome do operador (email do usuário)
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
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <div className="bg-gradient-to-r from-background via-background/95 to-background border-b border-primary/20 px-4 py-3">
            <div className="flex items-center justify-between">
                {/* Logo e Empresa */}
                <div className="flex items-center gap-4">
                    <h1
                        className="text-2xl font-bold text-primary"
                        style={{
                            fontFamily: 'Space Grotesk, sans-serif',
                            textShadow: '0 0 10px hsl(84 85% 55% / 0.3)'
                        }}
                    >
                        deep.
                    </h1>
                    {nomeEmpresa && (
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-foreground">
                                {nomeEmpresa}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                Caixa #{caixaAtual?.id ? caixaAtual.id.slice(0, 8) : '—'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Informações Centrais */}
                <div className="flex items-center gap-6">
                    {/* Operador */}
                    <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary/70" />
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Atendente</span>
                            <span className="text-sm font-medium text-foreground">{operadorNome}</span>
                        </div>
                    </div>

                    {/* Status do Caixa */}
                    {caixaAtual && (
                        <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-success" />
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Status</span>
                                <span className="text-sm font-medium text-success">Caixa Aberto</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Relógio */}
                <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg border border-primary/20">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-lg font-mono font-bold text-primary tabular-nums">
                        {formatTime(currentTime)}
                    </span>
                </div>
            </div>
        </div>
    );
}
