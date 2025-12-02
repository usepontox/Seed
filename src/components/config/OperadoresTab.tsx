import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { useEmpresa } from "@/hooks/use-empresa";

interface Operador {
    id: string;
    nome: string;
    codigo: string;
    empresa_id: string;
}

export default function OperadoresTab() {
    const { toast } = useToast();
    const { empresaId } = useEmpresa();
    const [operadores, setOperadores] = useState<Operador[]>([]);
    const [loading, setLoading] = useState(false);
    const [novoOperadorOpen, setNovoOperadorOpen] = useState(false);
    const [novoOperador, setNovoOperador] = useState({ nome: "", codigo: "" });

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
                    },
                ]);

            if (error) throw error;

            toast({ title: "Operador cadastrado com sucesso!" });
            setNovoOperador({ nome: "", codigo: "" });
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

    const handleDeleteOperador = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este operador?")) return;

        try {
            const { error } = await (supabase
                .from("operadores" as any) as any)
                .delete()
                .eq("id", id);

            if (error) throw error;

            toast({ title: "Operador excluído com sucesso!" });
            loadOperadores();
        } catch (error: any) {
            toast({
                title: "Erro ao excluir operador",
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
                        <CardTitle>Operadores de Caixa</CardTitle>
                        <CardDescription>
                            Gerencie os operadores que podem abrir e fechar o caixa
                        </CardDescription>
                    </div>
                    <Dialog open={novoOperadorOpen} onOpenChange={setNovoOperadorOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Novo Operador
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Novo Operador</DialogTitle>
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
                                        placeholder="Código para abrir o caixa"
                                    />
                                </div>
                                <Button onClick={handleAddOperador} disabled={loading} className="w-full">
                                    {loading ? "Salvando..." : "Salvar"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Código</TableHead>
                            <TableHead className="w-[100px]">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {operadores.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground">
                                    Nenhum operador cadastrado
                                </TableCell>
                            </TableRow>
                        ) : (
                            operadores.map((operador) => (
                                <TableRow key={operador.id}>
                                    <TableCell>{operador.nome}</TableCell>
                                    <TableCell>{operador.codigo}</TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteOperador(operador.id)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
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
