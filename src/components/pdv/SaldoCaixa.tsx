import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, ArrowDownCircle, ArrowUpCircle } from "lucide-react";

interface SaldoCaixaProps {
    numeroCaixa: string;
    saldoInicial: number;
    saldoAtual: number;
    status: string;
}

export default function SaldoCaixa({ numeroCaixa, saldoInicial, saldoAtual, status }: SaldoCaixaProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const diferenca = saldoAtual - saldoInicial;
    const percentual = saldoInicial > 0 ? ((diferenca / saldoInicial) * 100) : 0;

    return (
        <Card className="shadow-lg border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-muted-foreground">Caixa Atual</p>
                            <p className="text-lg font-bold">{numeroCaixa}</p>
                        </div>
                    </div>
                    <Badge
                        variant={status === 'aberto' ? 'default' : 'secondary'}
                        className="text-xs"
                    >
                        {status === 'aberto' ? '🟢 Aberto' : '🔴 Fechado'}
                    </Badge>
                </div>

                {/* Saldo Atual */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-primary/10">
                    <p className="text-xs text-muted-foreground mb-1">Saldo Atual</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(saldoAtual)}</p>
                </div>

                {/* Detalhes */}
                <div className="grid grid-cols-2 gap-2">
                    {/* Saldo Inicial */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-primary/10">
                        <div className="flex items-center gap-1 mb-1">
                            <ArrowUpCircle className="h-3 w-3 text-blue-500" />
                            <p className="text-[10px] text-muted-foreground">Inicial</p>
                        </div>
                        <p className="text-sm font-semibold">{formatCurrency(saldoInicial)}</p>
                    </div>

                    {/* Diferença */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-primary/10">
                        <div className="flex items-center gap-1 mb-1">
                            {diferenca >= 0 ? (
                                <TrendingUp className="h-3 w-3 text-green-500" />
                            ) : (
                                <ArrowDownCircle className="h-3 w-3 text-red-500" />
                            )}
                            <p className="text-[10px] text-muted-foreground">Diferença</p>
                        </div>
                        <p className={`text-sm font-semibold ${diferenca >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {diferenca >= 0 ? '+' : ''}{formatCurrency(diferenca)}
                        </p>
                    </div>
                </div>

                {/* Percentual */}
                {saldoInicial > 0 && (
                    <div className="text-center pt-1 border-t border-primary/10">
                        <p className="text-xs text-muted-foreground">
                            Variação: <span className={`font-semibold ${percentual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {percentual >= 0 ? '+' : ''}{percentual.toFixed(1)}%
                            </span>
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
