import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Loader2, User, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/hooks/use-empresa";

interface AberturaCaixaProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (saldoInicial: number, observacoes?: string, operadorId?: string) => Promise<boolean>;
    loading?: boolean;
}

interface Operador {
    id: string;
    nome: string;
    codigo: string;
}

export default function AberturaCaixa({ open, onOpenChange, onConfirm, loading }: AberturaCaixaProps) {
    const { empresaId } = useEmpresa();
    const [saldoInicial, setSaldoInicial] = useState("");
    const [observacoes, setObservacoes] = useState("");
    const [operadores, setOperadores] = useState<Operador[]>([]);
    const [selectedOperador, setSelectedOperador] = useState<string>("");
    const [loadingOperadores, setLoadingOperadores] = useState(false);
    const [novoOperadorOpen, setNovoOperadorOpen] = useState(false);
    const [novoOperadorNome, setNovoOperadorNome] = useState("");
    const [novoOperadorCodigo, setNovoOperadorCodigo] = useState("");

    useEffect(() => {
        if (open && empresaId) {
            loadOperadores();
        }
    }, [open, empresaId]);

    const loadOperadores = async () => {
        try {
            setLoadingOperadores(true);
            const { data, error } = await (supabase
                .from("operadores" as any) as any)
                .select("*")
                .eq("empresa_id", empresaId)
                .eq("ativo", true)
                .order("nome");

            if (error) throw error;
            setOperadores(data || []);
        } catch (error) {
            console.error("Erro ao carregar operadores:", error);
        } finally {
            setLoadingOperadores(false);
        }
    };

    const handleCreateOperador = async () => {
        if (!novoOperadorNome || !novoOperadorCodigo || !empresaId) return;

        try {
            const { data, error } = await (supabase
                .from("operadores" as any) as any)
                .insert([{
                    nome: novoOperadorNome,
                    codigo: novoOperadorCodigo,
                    empresa_id: empresaId
                }])
                .select()
                .single();

            if (error) throw error;

            setOperadores([...operadores, data]);
            setSelectedOperador(data.id);
            setNovoOperadorOpen(false);
            setNovoOperadorNome("");
            setNovoOperadorCodigo("");
        } catch (error) {
            console.error("Erro ao criar operador:", error);
        }
    };

    const handleConfirm = async () => {
        const valor = parseFloat(saldoInicial);
        if (isNaN(valor) || valor < 0) {
            return;
        }

        if (!selectedOperador) {
            return;
        }

        const sucesso = await onConfirm(valor, observacoes || undefined, selectedOperador);
        if (sucesso) {
            setSaldoInicial("");
            setObservacoes("");
            setSelectedOperador("");
            onOpenChange(false);
        }
    };

    if (novoOperadorOpen) {
        return (
            <Dialog open={true} onOpenChange={setNovoOperadorOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Novo Operador</DialogTitle>
                        <DialogDescription>Cadastre um novo operador para abrir o caixa.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nome</Label>
                            <Input
                                value={novoOperadorNome}
                                onChange={e => setNovoOperadorNome(e.target.value)}
                                placeholder="Nome do operador"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Código</Label>
                            <Input
                                value={novoOperadorCodigo}
                                onChange={e => setNovoOperadorCodigo(e.target.value)}
                                placeholder="Código de acesso"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setNovoOperadorOpen(false)} className="flex-1">Cancelar</Button>
                            <Button onClick={handleCreateOperador} className="flex-1" disabled={!novoOperadorNome || !novoOperadorCodigo}>Salvar</Button>
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
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                            <DollarSign className="h-6 w-6 text-white" />
                        </div>
                        Abertura de Caixa
                    </DialogTitle>
                    <DialogDescription>
                        Selecione o operador e informe o saldo inicial.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">Operador *</Label>
                        <div className="flex gap-2">
                            <Select value={selectedOperador} onValueChange={setSelectedOperador}>
                                <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Selecione o operador" />
                                </SelectTrigger>
                                <SelectContent>
                                    {operadores?.map(op => (
                                        <SelectItem key={op.id} value={op.id}>{op.nome}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button variant="outline" size="icon" onClick={() => setNovoOperadorOpen(true)}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        {operadores.length === 0 && !loadingOperadores && (
                            <p className="text-xs text-muted-foreground text-yellow-600">
                                Nenhum operador encontrado. Clique no + para adicionar.
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="saldo-inicial" className="text-sm font-semibold">
                            Saldo Inicial *
                        </Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                R$
                            </span>
                            <Input
                                id="saldo-inicial"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0,00"
                                value={saldoInicial}
                                onChange={(e) => setSaldoInicial(e.target.value)}
                                className="pl-10 h-12 text-lg"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="observacoes" className="text-sm font-semibold">
                            Observações (opcional)
                        </Label>
                        <Textarea
                            id="observacoes"
                            placeholder="Ex: Abertura do turno da manhã..."
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
                        disabled={loading || !saldoInicial || parseFloat(saldoInicial) < 0 || !selectedOperador}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Abrindo...
                            </>
                        ) : (
                            "Abrir Caixa"
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
