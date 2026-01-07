import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useEmpresa } from '@/hooks/use-empresa'

export default function IntegracoesTab() {
    const { toast } = useToast()
    const { empresaId } = useEmpresa()
    const [loading, setLoading] = useState(false)

    // Estado PIX
    const [pixAccessToken, setPixAccessToken] = useState('')
    const [pixAtivo, setPixAtivo] = useState(false)
    const [pixConfigSalva, setPixConfigSalva] = useState(false)
    const [webhookSecret, setWebhookSecret] = useState('')

    useEffect(() => {
        loadConfigPix()
    }, [empresaId])

    const loadConfigPix = async () => {
        if (!empresaId) return

        const { data } = await supabase
            .from('configuracoes_pix' as any)
            .select('*')
            .eq('empresa_id', empresaId)
            .maybeSingle()

        if (data) {
            setPixAccessToken(data.access_token_encrypted)
            setPixAtivo(data.ativo)
            setWebhookSecret(data.webhook_secret || '')
            setPixConfigSalva(true)
        }
    }

    const salvarConfigPix = async () => {
        if (!empresaId) return

        if (!pixAccessToken.trim()) {
            toast({
                title: 'Access Token obrigatório',
                description: 'Preencha o Access Token do Mercado Pago',
                variant: 'destructive'
            })
            return
        }

        setLoading(true)

        try {
            const { data: existing } = await supabase
                .from('configuracoes_pix')
                .select('id')
                .eq('empresa_id', empresaId)
                .maybeSingle()

            if (existing) {
                await supabase
                    .from('configuracoes_pix' as any)
                    .update({
                        access_token_encrypted: pixAccessToken,
                        webhook_secret: webhookSecret,
                        ativo: pixAtivo
                    })
                    .eq('id', existing.id)
            } else {
                await supabase
                    .from('configuracoes_pix' as any)
                    .insert({
                        empresa_id: empresaId,
                        access_token_encrypted: pixAccessToken,
                        webhook_secret: webhookSecret,
                        ativo: pixAtivo
                    })
            }

            setPixConfigSalva(true)
            toast({ title: 'Configuração PIX salva com sucesso!' })
        } catch (error: any) {
            toast({
                title: 'Erro ao salvar configuração',
                description: error.message,
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* PIX - Mercado Pago */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>PIX - Mercado Pago</CardTitle>
                            <CardDescription>
                                Gere QR Codes automáticos para pagamentos PIX
                            </CardDescription>
                        </div>
                        {pixConfigSalva && pixAtivo && (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            <strong>PIX Manual</strong>: Sem configuração, você registra manualmente quando receber.<br />
                            <strong>PIX Automático</strong>: Com Mercado Pago, gera QR Code e confirma automaticamente.
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                        <Label>Access Token do Mercado Pago</Label>
                        <Input
                            type="password"
                            placeholder="APP_USR-xxxxxxxxxxxx"
                            value={pixAccessToken}
                            onChange={(e) => setPixAccessToken(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Obtenha em: <a href="https://www.mercadopago.com.br/settings/account/credentials" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Mercado Pago → Credenciais</a>
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Assinatura Secreta do Webhook (opcional)</Label>
                        <Input
                            type="password"
                            placeholder="Assinatura secreta do webhook"
                            value={webhookSecret}
                            onChange={(e) => setWebhookSecret(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Encontre em: <a href="https://www.mercadopago.com.br/developers/panel/webhooks" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Mercado Pago → Webhooks</a>
                        </p>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch
                            checked={pixAtivo}
                            onCheckedChange={setPixAtivo}
                            disabled={!pixAccessToken}
                        />
                        <Label>Ativar PIX Automático</Label>
                    </div>

                    <Button onClick={salvarConfigPix} disabled={loading}>
                        {loading ? 'Salvando...' : 'Salvar Configuração PIX'}
                    </Button>
                </CardContent>
            </Card>

            {/* Placeholder para futuras integrações */}
            <Card className="opacity-50">
                <CardHeader>
                    <CardTitle>Outras Integrações</CardTitle>
                    <CardDescription>
                        Em breve: Integrações com gateways de pagamento, NF-e, etc.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    )
}
