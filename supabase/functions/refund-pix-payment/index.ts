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
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        const supabase = createClient(supabaseUrl!, supabaseKey!)

        const { vendaId, empresaId } = await req.json()

        console.log('Solicitando estorno para venda:', vendaId)

        // 1. Buscar transação PIX aprovada
        const { data: transacao, error: transacaoError } = await supabase
            .from('transacoes_pix')
            .select('*')
            .eq('venda_id', vendaId)
            .eq('status', 'approved')
            .maybeSingle()

        if (transacaoError || !transacao) {
            console.log('Nenhuma transação PIX aprovada encontrada para esta venda.')
            // Retorna sucesso pois pode ser cancelamento de venda sem pix ou pix nao pago
            return new Response(JSON.stringify({ success: true, message: 'Sem transação PIX para estornar' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // 2. Buscar credenciais
        const { data: config, error: configError } = await supabase
            .from('configuracoes_pix')
            .select('access_token_encrypted')
            .eq('empresa_id', empresaId)
            .single()

        if (configError || !config) {
            throw new Error('Configuração PIX não encontrada')
        }

        // 3. Solicitar Estorno no Mercado Pago
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${transacao.payment_id}/refunds`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.access_token_encrypted}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': crypto.randomUUID()
            }
        })

        const refundData = await response.json()

        if (!response.ok) {
            console.error('Erro no MP:', refundData)
            throw new Error(`Erro ao estornar no Mercado Pago: ${refundData.message || 'Erro desconhecido'}`)
        }

        console.log('Estorno realizado:', refundData.status)

        // 4. Atualizar status da transação
        await supabase
            .from('transacoes_pix')
            .update({
                status: 'refunded',
                updated_at: new Date().toISOString()
            })
            .eq('id', transacao.id)

        return new Response(JSON.stringify({ success: true, refund: refundData }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error('Erro:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
