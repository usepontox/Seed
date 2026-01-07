import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { vendaId, valor, empresaId } = await req.json()

        if (!vendaId || !valor || !empresaId) {
            throw new Error('Parâmetros obrigatórios: vendaId, valor, empresaId')
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Buscar configuração PIX
        const { data: config, error: configError } = await supabaseAdmin
            .from('configuracoes_pix')
            .select('access_token_encrypted, ativo')
            .eq('empresa_id', empresaId)
            .eq('ativo', true)
            .single()

        if (configError || !config) {
            throw new Error('Configuração PIX não encontrada ou inativa')
        }

        // Criar pagamento no Mercado Pago
        const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.access_token_encrypted}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': `${vendaId}-${Date.now()}`
            },
            body: JSON.stringify({
                transaction_amount: parseFloat(valor),
                description: `Venda #${vendaId}`,
                payment_method_id: 'pix',
                payer: {
                    email: 'cliente@email.com'
                }
            })
        })

        const payment = await mpResponse.json()

        if (!mpResponse.ok) {
            console.error('Erro Mercado Pago:', payment)
            throw new Error(payment.message || 'Erro ao criar pagamento no Mercado Pago')
        }

        // Verificar se tem dados do PIX
        if (!payment.point_of_interaction?.transaction_data) {
            throw new Error('Resposta do Mercado Pago sem dados de PIX')
        }

        // Salvar transação
        const { error: insertError } = await supabaseAdmin
            .from('transacoes_pix')
            .insert({
                venda_id: vendaId,
                empresa_id: empresaId,
                payment_id: payment.id.toString(),
                qr_code_base64: payment.point_of_interaction.transaction_data.qr_code_base64,
                qr_code_url: payment.point_of_interaction.transaction_data.qr_code,
                valor: parseFloat(valor),
                status: payment.status,
                expires_at: payment.date_of_expiration,
                metadata: payment
            })

        if (insertError) {
            console.error('Erro ao salvar transação:', insertError)
            throw insertError
        }

        return new Response(
            JSON.stringify({
                success: true,
                qrCode: payment.point_of_interaction.transaction_data.qr_code_base64,
                qrCodeUrl: payment.point_of_interaction.transaction_data.qr_code,
                paymentId: payment.id
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('Erro na função create-pix-payment:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
