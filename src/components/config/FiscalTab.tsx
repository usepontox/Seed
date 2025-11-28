import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, Upload, FileKey } from "lucide-react";

export default function FiscalTab() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [config, setConfig] = useState({
        certificado_url: "",
        senha_certificado: "",
        csc_token: "",
        csc_id: "",
        ambiente: "homologacao",
        serie_nfe: 1,
        serie_nfce: 1,
        proximo_numero_nfe: 1,
        proximo_numero_nfce: 1,
    });

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        const { data } = await supabase
            .from("configuracoes_empresa")
            .select("certificado_url, senha_certificado, csc_token, csc_id, ambiente, serie_nfe, serie_nfce, proximo_numero_nfe, proximo_numero_nfce" as any)
            .limit(1)
            .single();

        if (data) {
            const d = data as any;
            setConfig({
                certificado_url: d.certificado_url || "",
                senha_certificado: d.senha_certificado || "",
                csc_token: d.csc_token || "",
                csc_id: d.csc_id || "",
                ambiente: d.ambiente || "homologacao",
                serie_nfe: d.serie_nfe || 1,
                serie_nfce: d.serie_nfce || 1,
                proximo_numero_nfe: d.proximo_numero_nfe || 1,
                proximo_numero_nfce: d.proximo_numero_nfce || 1,
            });
        }
    };

    const handleCertificadoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            const file = event.target.files?.[0];
            if (!file) return;

            if (!file.name.endsWith('.pfx')) {
                toast({
                    title: "Formato inválido",
                    description: "O certificado deve ser um arquivo .pfx",
                    variant: "destructive",
                });
                return;
            }

            const fileExt = file.name.split(".").pop();
            const fileName = `certificado_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from("certificados")
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from("certificados").getPublicUrl(fileName);

            setConfig({ ...config, certificado_url: fileName });
            toast({ title: "Certificado enviado com sucesso!" });
        } catch (error: any) {
            toast({
                title: "Erro ao enviar certificado",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: existing } = await supabase
                .from("configuracoes_empresa")
                .select("id")
                .limit(1)
                .single();

            if (existing) {
                const { error } = await supabase
                    .from("configuracoes_empresa")
                    .update(config as any)
                    .eq("id", existing.id);
                if (error) throw error;
            } else {
                toast({ title: "Configure os dados da empresa primeiro na aba Empresa.", variant: "destructive" });
                return;
            }

            toast({ title: "Configurações fiscais salvas com sucesso!" });
        } catch (error: any) {
            toast({
                title: "Erro ao salvar configurações",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Configuração Fiscal (NF-e / NFC-e)</CardTitle>
                <CardDescription>
                    Configure seu certificado digital e dados para emissão de notas.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Certificado Digital (A1)</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="certificado">Arquivo .pfx</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="certificado"
                                        type="file"
                                        accept=".pfx"
                                        onChange={handleCertificadoUpload}
                                        disabled={uploading}
                                    />
                                    {uploading && <span className="text-sm text-muted-foreground">Enviando...</span>}
                                </div>
                                {config.certificado_url && (
                                    <p className="text-xs text-green-600 flex items-center gap-1">
                                        <FileKey className="h-3 w-3" /> Certificado carregado
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="senha_certificado">Senha do Certificado</Label>
                                <Input
                                    id="senha_certificado"
                                    type="password"
                                    value={config.senha_certificado}
                                    onChange={(e) => setConfig({ ...config, senha_certificado: e.target.value })}
                                    placeholder="Senha do arquivo .pfx"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Ambiente e CSC</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="ambiente">Ambiente de Emissão</Label>
                                <Select
                                    value={config.ambiente}
                                    onValueChange={(value) => setConfig({ ...config, ambiente: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o ambiente" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="homologacao">Homologação (Testes)</SelectItem>
                                        <SelectItem value="producao">Produção</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="csc_id">ID do CSC (Token)</Label>
                                <Input
                                    id="csc_id"
                                    value={config.csc_id}
                                    onChange={(e) => setConfig({ ...config, csc_id: e.target.value })}
                                    placeholder="Ex: 000001"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="csc_token">Código CSC (Alfanumérico)</Label>
                                <Input
                                    id="csc_token"
                                    value={config.csc_token}
                                    onChange={(e) => setConfig({ ...config, csc_token: e.target.value })}
                                    placeholder="Ex: A1B2C3D4..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Numeração e Séries</h3>
                        <div className="grid gap-4 md:grid-cols-4">
                            <div className="space-y-2">
                                <Label htmlFor="serie_nfe">Série NF-e</Label>
                                <Input
                                    id="serie_nfe"
                                    type="number"
                                    value={config.serie_nfe}
                                    onChange={(e) => setConfig({ ...config, serie_nfe: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="prox_nfe">Próx. Número NF-e</Label>
                                <Input
                                    id="prox_nfe"
                                    type="number"
                                    value={config.proximo_numero_nfe}
                                    onChange={(e) => setConfig({ ...config, proximo_numero_nfe: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="serie_nfce">Série NFC-e</Label>
                                <Input
                                    id="serie_nfce"
                                    type="number"
                                    value={config.serie_nfce}
                                    onChange={(e) => setConfig({ ...config, serie_nfce: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="prox_nfce">Próx. Número NFC-e</Label>
                                <Input
                                    id="prox_nfce"
                                    type="number"
                                    value={config.proximo_numero_nfce}
                                    onChange={(e) => setConfig({ ...config, proximo_numero_nfce: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                    </div>

                    <Button type="submit" disabled={loading}>
                        <Save className="h-4 w-4 mr-2" />
                        {loading ? "Salvando..." : "Salvar Configurações Fiscais"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
