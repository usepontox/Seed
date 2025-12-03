import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { useEmpresa } from "@/hooks/use-empresa";
import { Badge } from "@/components/ui/badge";

interface Operador {
    id: string;
    nome: string;
    codigo: string;
    empresa_id: string;
    role: 'operador' | 'supervisor';
    ativo: boolean;
}

export default function OperadoresTab() {
    const { toast } = useToast();
    const { empresaId } = useEmpresa();
    const [operadores, setOperadores] = useState<Operador[]>([]);
    const [loading, setLoading] = useState(false);
    const [novoOperadorOpen, setNovoOperadorOpen] = useState(false);
    const [novoOperador, setNovoOperador] = useState({ nome: "", codigo: "", role: "operador" });
    const [activeRole, setActiveRole] = useState<'operador' | 'supervisor'>('operador');

    useEffect(() => {
        if (empresaId) {
            loadOperadores();
        }
    }, [empresaId]);

    const loadOperadores = async () => {
        try {
            const { data, error } = await (supabase
                .from("operadores" as any) as any)
                .select("*")
                .eq("empresa_id", empresaId)
                .order("nome");

            if (error) throw error;
            setOperadores(data || []);
        } catch (error) {
            console.error("Erro ao carregar operadores:", error);
        }
    };

    const handleAddOperador = async () => {
        if (!novoOperador.nome || !novoOperador.codigo) {
            toast({
                title: "Erro",
                description: "Preencha todos os campos",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const { error } = await (supabase
                .from("operadores" as any) as any)
                .insert([
                    {
                        nome: novoOperador.nome,
                        codigo: novoOperador.codigo,
                        empresa_id: empresaId,
                        role: novoOperador.role,
                    },
                ]);

            if (error) throw error;

            toast({ title: "Cadastro realizado com sucesso!" });
            setNovoOperador({ nome: "", codigo: "", role: "operador" });
            setNovoOperadorOpen(false);
            loadOperadores();
        } catch (error: any) {
            toast({
                title: "Erro ao cadastrar operador",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await (supabase
                .from("operadores" as any) as any)
                .update({ ativo: !currentStatus })
                .eq("id", id);

            if (error) throw error;

            toast({ title: `Operador ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!` });
            loadOperadores();
        } catch (error: any) {
            toast({
                title: "Erro ao atualizar status",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Cadastros</CardTitle>
                        <CardDescription>
                            Gerencie os operadores e supervisores do sistema
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex bg-muted p-1 rounded-md">
                            <Button
                                variant={activeRole === 'operador' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveRole('operador')}
                            >
                                Operadores
                            </Button>
                            <Button
                                variant={activeRole === 'supervisor' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveRole('supervisor')}
                            >
                                Supervisores
                            </Button>
                        </div>
                        <Dialog open={novoOperadorOpen} onOpenChange={setNovoOperadorOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Novo {activeRole === 'operador' ? 'Operador' : 'Supervisor'}
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Novo {activeRole === 'operador' ? 'Operador' : 'Supervisor'}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="nome">Nome</Label>
                                        <Input
                                            id="nome"
                                            value={novoOperador.nome}
                                            onChange={(e) => setNovoOperador({ ...novoOperador, nome: e.target.value })}
                                            placeholder="Nome do operador"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="codigo">Código de Acesso</Label>
                                        <Input
                                            id="codigo"
                                            value={novoOperador.codigo}
                                            onChange={(e) => setNovoOperador({ ...novoOperador, codigo: e.target.value })}
                                            placeholder={activeRole === 'operador' ? "Código para abrir o caixa" : "Senha do supervisor"}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Função</Label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="role"
                                                    checked={novoOperador.role === 'operador'}
                                                    onChange={() => setNovoOperador({ ...novoOperador, role: 'operador' })}
                                                />
                                                Operador
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="role"
                                                    checked={novoOperador.role === 'supervisor'}
                                                    onChange={() => setNovoOperador({ ...novoOperador, role: 'supervisor' })}
                                                />
                                                Supervisor
                                            </label>
                                        </div>
                                    </div>
                                    <Button onClick={handleAddOperador} disabled={loading} className="w-full">
                                        {loading ? "Salvando..." : "Salvar"}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Código</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[100px]">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {operadores.filter(op => op.role === activeRole || (!op.role && activeRole === 'operador')).length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground">
                                    Nenhum {activeRole} cadastrado
                                </TableCell>
                            </TableRow>
                        ) : (
                            operadores
                                .filter(op => op.role === activeRole || (!op.role && activeRole === 'operador'))
                                .map((operador) => (
                                    <TableRow key={operador.id}>
                                        <TableCell>{operador.nome}</TableCell>
                                        <TableCell>{operador.codigo}</TableCell>
                                        <TableCell>
                                            <Badge variant={operador.ativo ? "default" : "destructive"}>
                                                {operador.ativo ? "Ativo" : "Inativo"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleToggleStatus(operador.id, operador.ativo)}
                                                className={operador.ativo ? "text-destructive hover:text-destructive" : "text-green-600 hover:text-green-600"}
                                            >
                                                {operador.ativo ? (
                                                    <div className="flex items-center gap-2">
                                                        <XCircle className="h-4 w-4" />
                                                        <span className="sr-only">Desativar</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle2 className="h-4 w-4" />
                                                        <span className="sr-only">Ativar</span>
                                                    </div>
                                                )}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
