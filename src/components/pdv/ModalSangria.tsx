import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDownCircle, ArrowUpCircle, Loader2, AlertCircle, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEmpresa } from "@/hooks/use-empresa";

interface ModalSangriaProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirmSangria: (valor: number, descricao: string) => Promise<boolean>;
    onConfirmSuprimento: (valor: number, descricao: string) => Promise<boolean>;
    loading?: boolean;
    saldoAtual: number;
    isSupervisor: boolean;
}

export default function ModalSangria({
    open,
    onOpenChange,
    onConfirmSangria,
    onConfirmSuprimento,
    loading,
    saldoAtual,
    isSupervisor
}: ModalSangriaProps) {
    const { toast } = useToast();
    const { empresaId } = useEmpresa();
    const [valor, setValor] = useState("");
    const [descricao, setDescricao] = useState("");
    const [tipo, setTipo] = useState<"sangria" | "suprimento">("sangria");
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

    const handleConfirm = async () => {
        const valorNum = parseFloat(valor);
        if (isNaN(valorNum) || valorNum <= 0 || !descricao.trim()) {
            return;
        }

        let sucesso = false;
        if (tipo === "sangria") {
            sucesso = await onConfirmSangria(valorNum, descricao);
        } else {
            sucesso = await onConfirmSuprimento(valorNum, descricao);
        }

        if (sucesso) {
            setValor("");
            setDescricao("");
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
                            Digite a senha do supervisor para realizar sangrias e suprimentos.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="senha-supervisor">Senha do Supervisor ou Código de Barras</Label>
                            <Input
                                id="senha-supervisor"
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl">Movimentação de Caixa</DialogTitle>
                    <DialogDescription>
                        Registre sangrias (retiradas) ou suprimentos (adições) de dinheiro no caixa.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={tipo} onValueChange={(v) => setTipo(v as "sangria" | "suprimento")} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="sangria" className="gap-2">
                            <ArrowDownCircle className="h-4 w-4" />
                            Sangria
                        </TabsTrigger>
                        <TabsTrigger value="suprimento" className="gap-2">
                            <ArrowUpCircle className="h-4 w-4" />
                            Suprimento
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="sangria" className="space-y-4 mt-4">
                        <Alert>
                            <ArrowDownCircle className="h-4 w-4" />
                            <AlertDescription>
                                Saldo disponível: <strong>{formatCurrency(saldoAtual)}</strong>
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                            <Label htmlFor="valor-sangria" className="text-sm font-semibold">
                                Valor da Sangria *
                            </Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    R$
                                </span>
                                <Input
                                    id="valor-sangria"
                                    type="number"
                                    min="0"
                                    max={saldoAtual}
                                    step="0.01"
                                    placeholder="0,00"
                                    value={valor}
                                    onChange={(e) => setValor(e.target.value)}
                                    className="pl-10 h-12 text-lg"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="descricao-sangria" className="text-sm font-semibold">
                                Motivo *
                            </Label>
                            <Textarea
                                id="descricao-sangria"
                                placeholder="Ex: Pagamento de fornecedor, troco, etc..."
                                value={descricao}
                                onChange={(e) => setDescricao(e.target.value)}
                                className="resize-none"
                                rows={3}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="suprimento" className="space-y-4 mt-4">
                        <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950">
                            <ArrowUpCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800 dark:text-green-200">
                                Adicionar dinheiro ao caixa
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                            <Label htmlFor="valor-suprimento" className="text-sm font-semibold">
                                Valor do Suprimento *
                            </Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    R$
                                </span>
                                <Input
                                    id="valor-suprimento"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0,00"
                                    value={valor}
                                    onChange={(e) => setValor(e.target.value)}
                                    className="pl-10 h-12 text-lg"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="descricao-suprimento" className="text-sm font-semibold">
                                Motivo *
                            </Label>
                            <Textarea
                                id="descricao-suprimento"
                                placeholder="Ex: Reforço de troco, devolução, etc..."
                                value={descricao}
                                onChange={(e) => setDescricao(e.target.value)}
                                className="resize-none"
                                rows={3}
                            />
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="flex gap-3 mt-4">
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
                        className={tipo === "sangria" ? "flex-1 bg-red-600 hover:bg-red-700" : "flex-1 bg-green-600 hover:bg-green-700"}
                        disabled={loading || !valor || parseFloat(valor) <= 0 || !descricao.trim()}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processando...
                            </>
                        ) : (
                            <>
                                {tipo === "sangria" ? (
                                    <>
                                        <ArrowDownCircle className="mr-2 h-4 w-4" />
                                        Confirmar Sangria
                                    </>
                                ) : (
                                    <>
                                        <ArrowUpCircle className="mr-2 h-4 w-4" />
                                        Confirmar Suprimento
                                    </>
                                )}
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
