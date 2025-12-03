import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Receipt, Loader2, AlertTriangle, CheckCircle2, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEmpresa } from "@/hooks/use-empresa";

interface FechamentoCaixaProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (saldoFinal: number, observacoes?: string) => Promise<boolean>;
    loading?: boolean;
    isSupervisor: boolean;
    caixaInfo: {
        numero_caixa: string;
        saldo_inicial: number;
        saldo_atual: number;
        data_abertura: string;
    } | null;
}

export default function FechamentoCaixa({
    open,
    onOpenChange,
    onConfirm,
    loading,
    isSupervisor,
    caixaInfo
}: FechamentoCaixaProps) {
    const { toast } = useToast();
    const { empresaId } = useEmpresa();
    const [saldoFinal, setSaldoFinal] = useState("");
    const [observacoes, setObservacoes] = useState("");
    const [diferenca, setDiferenca] = useState(0);
    const [senhaValidada, setSenhaValidada] = useState(false);
    const [senha, setSenha] = useState("");
    const [validandoSenha, setValidandoSenha] = useState(false);
    const [barcodeBuffer, setBarcodeBuffer] = useState("");
    const [lastKeyTime, setLastKeyTime] = useState(0);

    const validarSenha = async () => {
        if (!senha.trim()) {
            toast({
                title: "Erro",
                description: "Digite a senha do supervisor",
                variant: "destructive"
            });
            return;
        }

        setValidandoSenha(true);
        try {
            const { data, error } = await (supabase
                .from("operadores" as any) as any)
                .select("*")
                .eq("empresa_id", empresaId)
                .eq("role", "supervisor")
                .eq("codigo", senha)
                .eq("ativo", true)
                .single();

            if (error || !data) {
                toast({
                    title: "Senha inválida",
                    description: "Senha de supervisor incorreta",
                    variant: "destructive"
                });
                setSenha("");
                return;
            }

            setSenhaValidada(true);
            toast({
                title: "Acesso autorizado",
                description: `Bem-vindo, ${data.nome}!`
            });
        } catch (error) {
            toast({
                title: "Erro",
                description: "Erro ao validar senha",
                variant: "destructive"
            });
        } finally {
            setValidandoSenha(false);
        }
    };

    useEffect(() => {
        if (saldoFinal && caixaInfo) {
            const valor = parseFloat(saldoFinal);
            if (!isNaN(valor)) {
                setDiferenca(valor - caixaInfo.saldo_atual);
            }
        } else {
            setDiferenca(0);
        }
    }, [saldoFinal, caixaInfo]);

    const handleConfirm = async () => {
        const valor = parseFloat(saldoFinal);
        if (isNaN(valor) || valor < 0) {
            return;
        }

        const sucesso = await onConfirm(valor, observacoes || undefined);
        if (sucesso) {
            setSaldoFinal("");
            setObservacoes("");
            setSenhaValidada(false);
            setSenha("");
            onOpenChange(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatDateTime = (date: string) => {
        return new Date(date).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Tela de validação de senha
    if (!senhaValidada) {
        return (
            <Dialog open={open} onOpenChange={(isOpen) => {
                onOpenChange(isOpen);
                if (!isOpen) {
                    setSenha("");
                    setSenhaValidada(false);
                }
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <Lock className="h-6 w-6 text-primary" />
                            Autorização de Supervisor
                        </DialogTitle>
                        <DialogDescription>
                            Digite a senha do supervisor para fechar o caixa.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="senha-supervisor-fechamento">Senha do Supervisor ou Código de Barras</Label>
                            <Input
                                id="senha-supervisor-fechamento"
                                type="text"
                                placeholder="Digite a senha ou passe o cartão no leitor"
                                value={senha}
                                onChange={(e) => setSenha(e.target.value)}
                                onKeyDown={(e) => {
                                    const currentTime = Date.now();
                                    const timeDiff = currentTime - lastKeyTime;

                                    // Detectar leitura de código de barras (teclas rápidas < 50ms)
                                    if (timeDiff < 50 && e.key !== "Enter") {
                                        setBarcodeBuffer(prev => prev + e.key);
                                        setLastKeyTime(currentTime);
                                    } else if (e.key === "Enter") {
                                        // Enter após leitura rápida = código de barras completo
                                        if (barcodeBuffer.length > 0) {
                                            setSenha(barcodeBuffer);
                                            setBarcodeBuffer("");
                                            // Auto-validar após pequeno delay
                                            setTimeout(() => {
                                                validarSenha();
                                            }, 100);
                                        } else if (senha.trim()) {
                                            // Enter normal = validar senha digitada
                                            validarSenha();
                                        }
                                    } else {
                                        // Resetar buffer se digitação lenta (manual)
                                        setBarcodeBuffer("");
                                        setLastKeyTime(currentTime);
                                    }
                                }}
                                autoFocus
                                disabled={validandoSenha}
                            />
                            <p className="text-xs text-muted-foreground">
                                💡 Dica: Passe o cartão do supervisor no leitor de código de barras para validação rápida
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    onOpenChange(false);
                                    setSenha("");
                                }}
                                className="flex-1"
                                disabled={validandoSenha}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={validarSenha}
                                className="flex-1"
                                disabled={!senha.trim() || validandoSenha}
                            >
                                {validandoSenha ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Validando...
                                    </>
                                ) : (
                                    <>
                                        <Lock className="mr-2 h-4 w-4" />
                                        Validar
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    if (!caixaInfo) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                            <Receipt className="h-6 w-6 text-white" />
                        </div>
                        Fechamento de Caixa
                    </DialogTitle>
                    <DialogDescription>
                        Confira os valores e informe o saldo físico para fechar o caixa.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Informações do Caixa */}
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Caixa:</span>
                            <span className="font-semibold">{caixaInfo.numero_caixa}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Abertura:</span>
                            <span className="text-sm">{formatDateTime(caixaInfo.data_abertura)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Saldo Inicial:</span>
                            <span className="font-semibold">{formatCurrency(caixaInfo.saldo_inicial)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Saldo Esperado:</span>
                            <span className="text-lg font-bold text-primary">{formatCurrency(caixaInfo.saldo_atual)}</span>
                        </div>
                    </div>

                    {/* Saldo Final (Físico) */}
                    <div className="space-y-2">
                        <Label htmlFor="saldo-final" className="text-sm font-semibold">
                            Saldo Físico (Dinheiro em Caixa) *
                        </Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                R$
                            </span>
                            <Input
                                id="saldo-final"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0,00"
                                value={saldoFinal}
                                onChange={(e) => setSaldoFinal(e.target.value)}
                                className="pl-10 h-12 text-lg"
                                autoFocus
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Conte o dinheiro físico no caixa e informe o valor total
                        </p>
                    </div>

                    {/* Diferença */}
                    {saldoFinal && (
                        <Alert variant={diferenca === 0 ? "default" : "destructive"} className={diferenca === 0 ? "border-green-500 bg-green-50 dark:bg-green-950" : ""}>
                            {diferenca === 0 ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                                <AlertTriangle className="h-4 w-4" />
                            )}
                            <AlertDescription className={diferenca === 0 ? "text-green-800 dark:text-green-200" : ""}>
                                {diferenca === 0 ? (
                                    <span className="font-semibold">✓ Valores conferem!</span>
                                ) : (
                                    <>
                                        <span className="font-semibold">
                                            {diferenca > 0 ? '⚠️ Sobra' : '⚠️ Falta'}: {formatCurrency(Math.abs(diferenca))}
                                        </span>
                                        <p className="text-xs mt-1">
                                            {diferenca > 0
                                                ? 'O saldo físico está maior que o esperado'
                                                : 'O saldo físico está menor que o esperado'}
                                        </p>
                                    </>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Observações */}
                    <div className="space-y-2">
                        <Label htmlFor="observacoes" className="text-sm font-semibold">
                            Observações (opcional)
                        </Label>
                        <Textarea
                            id="observacoes"
                            placeholder="Ex: Conferido e aprovado, diferença justificada por..."
                            value={observacoes}
                            onChange={(e) => setObservacoes(e.target.value)}
                            className="resize-none"
                            rows={3}
                        />
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="flex-1"
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        className="flex-1 bg-gradient-primary"
                        disabled={loading || !saldoFinal || parseFloat(saldoFinal) < 0}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Fechando...
                            </>
                        ) : (
                            <>
                                <Receipt className="mr-2 h-4 w-4" />
                                Fechar Caixa
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
