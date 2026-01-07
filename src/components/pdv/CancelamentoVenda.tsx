import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Loader2, AlertTriangle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEmpresa } from "@/hooks/use-empresa";

interface CancelamentoVendaProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vendaId: string;
    vendaNumero: string;
    onSuccess: () => void;
}

export default function CancelamentoVenda({
    open,
    onOpenChange,
    vendaId,
    vendaNumero,
    onSuccess
}: CancelamentoVendaProps) {
    const { toast } = useToast();
    const { empresaId } = useEmpresa();
    const [senha, setSenha] = useState("");
    const [motivo, setMotivo] = useState("");
    const [validandoSenha, setValidandoSenha] = useState(false);
    const [senhaValidada, setSenhaValidada] = useState(false);
    const [cancelando, setCancelando] = useState(false);
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

    const confirmarCancelamento = async () => {
        if (!motivo.trim()) {
            toast({
                title: "Motivo obrigatório",
                description: "Informe o motivo do cancelamento",
                variant: "destructive"
            });
            return;
        }

        setCancelando(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            // Buscar dados da venda e itens
            const { data: venda, error: vendaError } = await (supabase
                .from("vendas" as any) as any)
                .select("*, vendas_itens(*)")
                .eq("id", vendaId)
                .single();

            if (vendaError) throw vendaError;

            if (venda.status === 'cancelada') {
                throw new Error("Esta venda já está cancelada");
            }

            // Se for PIX Mercado Pago, tentar estornar
            if (venda.forma_pagamento === 'pix_mp') {
                toast({ title: "Processando estorno PIX..." });

                const { data: refundResponse, error: refundParamsError } = await supabase.functions.invoke('refund-pix-payment', {
                    body: { vendaId: vendaId, empresaId: empresaId }
                });

                if (refundParamsError) {
                    console.error("Erro na função de estorno:", refundParamsError);
                    throw new Error("Falha ao comunicar com serviço de estorno: " + refundParamsError.message);
                }

                if (refundResponse?.error) {
                    console.error("Erro no estorno:", refundResponse.error);
                    throw new Error("Falha no estorno PIX: " + refundResponse.error);
                }

                if (refundResponse?.success && refundResponse?.refund) {
                    toast({
                        title: "Estorno Realizado",
                        description: "O valor foi devolvido ao cliente via PIX."
                    });
                }
            }

            // Atualizar status da venda
            const { error: updateError } = await (supabase
                .from("vendas" as any) as any)
                .update({
                    status: 'cancelada',
                    cancelada_em: new Date().toISOString(),
                    cancelada_por: user.id,
                    motivo_cancelamento: motivo
                })
                .eq("id", vendaId);

            if (updateError) throw updateError;

            // Estornar estoque de cada item (exceto produtos manuais)
            if (venda.vendas_itens && venda.vendas_itens.length > 0) {
                for (const item of venda.vendas_itens) {
                    if (!item.produto_id.startsWith('manual-')) {
                        // Estornar estoque
                        const { data: produto } = await (supabase
                            .from("produtos" as any) as any)
                            .select("estoque_atual")
                            .eq("id", item.produto_id)
                            .single();

                        if (produto) {
                            const novoEstoque = (produto.estoque_atual || 0) + item.quantidade;

                            await (supabase
                                .from("produtos" as any) as any)
                                .update({ estoque_atual: novoEstoque })
                                .eq("id", item.produto_id);

                            // Registrar movimentação de estoque
                            await (supabase
                                .from("estoque_movimentacoes" as any) as any)
                                .insert([{
                                    produto_id: item.produto_id,
                                    empresa_id: empresaId,
                                    tipo: 'estorno',
                                    quantidade: item.quantidade,
                                    estoque_anterior: produto.estoque_atual,
                                    estoque_novo: novoEstoque,
                                    referencia_tipo: 'cancelamento_venda',
                                    referencia_id: vendaId,
                                    usuario_id: user.id,
                                    observacao: `Estorno por cancelamento - ${motivo}`
                                }]);
                        }
                    }
                }
            }

            // Registrar em auditoria
            await (supabase
                .from("audit_logs" as any) as any)
                .insert([{
                    empresa_id: empresaId,
                    usuario_id: user.id,
                    acao: 'venda_cancelada',
                    entidade: 'vendas',
                    entidade_id: vendaId,
                    dados_antes: { status: venda.status },
                    dados_depois: { status: 'cancelada' },
                    motivo: motivo
                }]);

            toast({
                title: "Venda cancelada!",
                description: `Venda ${vendaNumero} cancelada com sucesso`
            });

            // Resetar estados
            setSenha("");
            setMotivo("");
            setSenhaValidada(false);
            onOpenChange(false);
            onSuccess();
        } catch (error: any) {
            toast({
                title: "Erro ao cancelar venda",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setCancelando(false);
        }
    };

    // Tela de validação de senha
    if (!senhaValidada) {
        return (
            <Dialog open={open} onOpenChange={(isOpen) => {
                onOpenChange(isOpen);
                if (!isOpen) {
                    setSenha("");
                    setMotivo("");
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
                            Digite a senha do supervisor para cancelar a venda.
                        </DialogDescription>
                    </DialogHeader>
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            <strong>Atenção:</strong> Esta ação irá cancelar a venda {vendaNumero} e estornar o estoque dos produtos.
                        </AlertDescription>
                    </Alert>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="senha-supervisor-cancelamento">Senha do Supervisor ou Código de Barras</Label>
                            <Input
                                id="senha-supervisor-cancelamento"
                                type="text"
                                placeholder="Digite a senha ou passe o cartão no leitor"
                                value={senha}
                                onChange={(e) => setSenha(e.target.value)}
                                onKeyDown={(e) => {
                                    const currentTime = Date.now();
                                    const timeDiff = currentTime - lastKeyTime;

                                    if (timeDiff < 50 && e.key !== "Enter") {
                                        setBarcodeBuffer(prev => prev + e.key);
                                        setLastKeyTime(currentTime);
                                    } else if (e.key === "Enter") {
                                        if (barcodeBuffer.length > 0) {
                                            setSenha(barcodeBuffer);
                                            setBarcodeBuffer("");
                                            setTimeout(() => validarSenha(), 100);
                                        } else if (senha.trim()) {
                                            validarSenha();
                                        }
                                    } else {
                                        setBarcodeBuffer("");
                                        setLastKeyTime(currentTime);
                                    }
                                }}
                                autoFocus
                                disabled={validandoSenha}
                            />
                            <p className="text-xs text-muted-foreground">
                                💡 Dica: Passe o cartão do supervisor no leitor de código de barras
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

    // Tela de confirmação de cancelamento
    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            onOpenChange(isOpen);
            if (!isOpen) {
                setSenha("");
                setMotivo("");
                setSenhaValidada(false);
            }
        }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-destructive">
                        <XCircle className="h-6 w-6" />
                        Cancelar Venda
                    </DialogTitle>
                    <DialogDescription>
                        Informe o motivo do cancelamento da venda {vendaNumero}.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            O estoque dos produtos será estornado automaticamente.
                        </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                        <Label htmlFor="motivo">Motivo do Cancelamento *</Label>
                        <Textarea
                            id="motivo"
                            placeholder="Ex: Cliente desistiu da compra, erro no pedido, etc."
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            rows={4}
                            autoFocus
                        />
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => {
                                onOpenChange(false);
                                setSenha("");
                                setMotivo("");
                                setSenhaValidada(false);
                            }}
                            className="flex-1"
                            disabled={cancelando}
                        >
                            Voltar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmarCancelamento}
                            className="flex-1"
                            disabled={!motivo.trim() || cancelando}
                        >
                            {cancelando ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Cancelando...
                                </>
                            ) : (
                                <>
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Confirmar Cancelamento
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
