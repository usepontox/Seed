import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // Verificar se o usuário é admin
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) {
            throw new Error('Unauthorized')
        }

        if (user.email !== 'admin@admin.com' && user.user_metadata?.role !== 'admin' && user.user_metadata?.role !== 'super_admin') {
            throw new Error('Forbidden: Apenas administradores podem realizar esta ação')
        }

        // Criar cliente admin com service role
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { action, payload } = await req.json()

        let result;

        switch (action) {
            case 'listUsers':
                const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
                if (listError) throw listError
                result = users.users
                break

            case 'createUser':
                const { email, password, nome, role } = payload
                const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                    email,
                    password,
                    email_confirm: true,
                    user_metadata: { nome, role }
                })
                if (createError) throw createError
                result = newUser
                break

            case 'updateUser':
                const { id, updates } = payload
                const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                    id,
                    { user_metadata: updates }
                )
                if (updateError) throw updateError
                result = updatedUser
                break

            case 'deleteUser':
                const { userId } = payload
                const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
                if (deleteError) throw deleteError
                result = { success: true }
                break

            default:
                throw new Error('Invalid action')
        }

        return new Response(
            JSON.stringify(result),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        )
    }
})
