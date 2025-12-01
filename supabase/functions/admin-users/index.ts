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
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (!serviceRoleKey) {
            console.error('SUPABASE_SERVICE_ROLE_KEY is missing');
            throw new Error('Configuration error: Missing service role key');
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            serviceRoleKey
        )

        const { action, payload } = await req.json()
        console.log(`Action received: ${action}`);

        let result;

        switch (action) {
            case 'health':
                result = { status: 'ok', serviceRoleKeyPresent: !!serviceRoleKey };
                break;

            // --- USUÁRIOS ---
            case 'listUsers':
                const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
                if (listError) throw listError
                result = users.users
                break

            case 'createUser':
                const { email, password, nome, role, empresaNome } = payload
                const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                    email,
                    password,
                    email_confirm: true,
                    user_metadata: { nome, role }
                })
                if (createError) throw createError

                // Enviar e-mail de boas-vindas diretamente via Resend API
                try {
                    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
                    if (RESEND_API_KEY) {
                        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f3f4f6; }
        .container { background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
        .header { background: white; padding: 40px 30px 20px 30px; text-align: center; border-bottom: 1px solid #f3f4f6; }
        .logo { font-size: 48px; font-weight: 900; color: #2563eb; letter-spacing: -2px; line-height: 1; margin-bottom: 10px; display: inline-block; }
        .content { padding: 30px; }
        .credentials { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb; }
        .credential-value { font-family: 'Courier New', monospace; background: #e2e8f0; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 5px; color: #1e293b; font-weight: 600; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; font-size: 16px; transition: background 0.3s; }
        .button:hover { background: #1d4ed8; }
        .warning { background: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px; color: #1e40af; }
        .welcome-text { color: #4b5563; font-size: 18px; margin-top: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">deep.</div>
            <div class="welcome-text">Bem-vindo ao Sistema PDV!</div>
        </div>
        <div class="content">
            <p style="font-size: 16px;">Olá, <strong>${nome}</strong>!</p>
            <p style="color: #4b5563;">Seu acesso ao Sistema PDV da empresa <strong>${empresaNome || 'sua empresa'}</strong> foi criado com sucesso.</p>
            
            <div class="credentials">
                <h3 style="margin-top: 0; color: #2563eb; font-size: 18px;">🔐 Suas Credenciais de Acesso</h3>
                <div><strong style="color: #475569;">E-mail:</strong><br><div class="credential-value">${email}</div></div>
                <div style="margin-top: 15px;"><strong style="color: #475569;">Senha Temporária:</strong><br><div class="credential-value">${password}</div></div>
            </div>
            
            <div class="warning">
                <strong>⚠️ Importante:</strong> Por segurança, altere sua senha no primeiro acesso ao sistema.
            </div>
            
            <div style="text-align: center;">
                <a href="https://usepontox.com.br/auth" class="button">Acessar Sistema Agora →</a>
            </div>
        
        <!-- Assinatura Personalizada -->
        <div style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                <tr>
                    <td style="padding-right: 20px; vertical-align: middle;">
                        <!-- Logo Deep -->
                        <img src="https://zwywggyytstatsfffbou.supabase.co/storage/v1/object/public/imagenslogotipo/ChatGPT%20Image%2027%20de%20nov.%20de%202025,%2015_56_00%20-%20Editado.png" alt="Logo Deep" width="80" height="80" style="border-radius: 50%; display: block;">
                    </td>
                    <td style="vertical-align: middle; border-left: 2px solid #e5e7eb; padding-left: 20px;">
                        <p style="margin: 0; font-family: 'Segoe UI', sans-serif; font-weight: bold; font-size: 18px; color: #1f2937;">José Rafael</p>
                        <p style="margin: 2px 0 10px 0; font-family: 'Segoe UI', sans-serif; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">CEO</p>
                        
                        <!-- WhatsApp -->
                        <p style="margin: 2px 0; font-family: 'Segoe UI', sans-serif; font-size: 14px;">
                            <a href="https://wa.me/5541995760345" style="text-decoration: none; color: #4b5563;">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/24px-WhatsApp.svg.png" alt="WhatsApp" width="16" height="16" style="vertical-align: middle; margin-right: 5px;">
                                <span style="vertical-align: middle;">+55 41 99576-0345</span>
                            </a>
                        </p>

                        <!-- Instagram -->
                        <p style="margin: 2px 0; font-family: 'Segoe UI', sans-serif; font-size: 14px;">
                            <a href="https://instagram.com/deep.saas" style="text-decoration: none; color: #E1306C;">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/24px-Instagram_icon.png" alt="Instagram" width="16" height="16" style="vertical-align: middle; margin-right: 5px;">
                                <span style="vertical-align: middle;">Instagram</span>
                            </a>
                        </p>
                    </td>
                </tr>
            </table>
        </div>

        <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
            <p>Este é um e-mail automático. Por favor, não responda.</p>
        </div>
    </div> <!-- Fim .content -->
    </div> <!-- Fim .container -->
</body>
</html>`

                        const emailRes = await fetch('https://api.resend.com/emails', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${RESEND_API_KEY}`
                            },
                            body: JSON.stringify({
                                from: 'Sistema PDV <deep.comunicacao@usepontox.com.br>',
                                to: [email],
                                subject: '🎉 Bem-vindo ao Sistema PDV - Suas Credenciais de Acesso',
                                html: emailHtml
                            })
                        })

                        if (emailRes.ok) {
                            console.log(`Welcome email sent to ${email}`)
                        } else {
                            const errorData = await emailRes.json()
                            console.error('Failed to send email:', errorData)
                        }
                    }
                } catch (emailError) {
                    console.error('Email sending error:', emailError)
                    // Não falhar a criação do usuário se o e-mail falhar
                }

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

            case 'updateUserPassword':
                const { userId: pwdUserId, newPassword } = payload
                const { data: pwdUser, error: pwdError } = await supabaseAdmin.auth.admin.updateUserById(
                    pwdUserId,
                    { password: newPassword }
                )
                if (pwdError) throw pwdError
                result = { success: true }
                break

            case 'deleteUser':
                const { userId } = payload
                const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
                if (deleteError) throw deleteError
                result = { success: true }
                break

            case 'deleteUserByEmail':
                const { email: userEmail } = payload
                // Buscar usuário pelo email
                const { data: allUsers, error: listErr } = await supabaseAdmin.auth.admin.listUsers()
                if (listErr) throw listErr

                const userByEmail = allUsers.users.find(u => u.email?.toLowerCase() === userEmail.toLowerCase())
                if (!userByEmail) {
                    throw new Error(`Usuário com email ${userEmail} não encontrado`)
                }

                const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userByEmail.id)
                if (delErr) throw delErr
                result = { success: true, deletedUserId: userByEmail.id }
                break

            // --- ASSINATURAS ---
            case 'listAssinaturas':
                const { data: assinaturas, error: assError } = await supabaseAdmin
                    .from('assinaturas')
                    .select('*, empresas(nome, cnpj)')
                if (assError) throw assError
                result = assinaturas
                break

            case 'upsertAssinatura':
                const { assinatura } = payload
                const { data: upsertedAss, error: upsertError } = await supabaseAdmin
                    .from('assinaturas')
                    .upsert(assinatura)
                    .select()
                    .single()
                if (upsertError) throw upsertError
                result = upsertedAss
                break

            case 'deleteAssinatura':
                const { assinaturaId } = payload
                const { error: delAssError } = await supabaseAdmin
                    .from('assinaturas')
                    .delete()
                    .eq('id', assinaturaId)
                if (delAssError) throw delAssError
                result = { success: true }
                break

            case 'listEmpresas':
                const { data: empresas, error: empError } = await supabaseAdmin
                    .from('empresas')
                    .select('*')
                if (empError) throw empError
                result = empresas
                break

            case 'createEmpresa':
                const { empresa } = payload
                const { data: novaEmpresa, error: createEmpError } = await supabaseAdmin
                    .from('empresas')
                    .insert({
                        nome: empresa.nome,
                        cnpj: empresa.cnpj,
                        email: empresa.email,
                        telefone: empresa.telefone,
                        endereco: empresa.endereco,
                        cidade: empresa.cidade,
                        estado: empresa.estado,
                        cep: empresa.cep
                    })
                    .select()
                    .single()
                if (createEmpError) throw createEmpError
                result = novaEmpresa
                break

            case 'updateEmpresa':
                const { empresaId, empresaData } = payload
                const { data: updatedEmpresa, error: empUpdateError } = await supabaseAdmin
                    .from('empresas')
                    .update(empresaData)
                    .eq('id', empresaId)
                    .select()
                    .single()
                if (empUpdateError) throw empUpdateError
                result = updatedEmpresa
                break

            case 'deleteEmpresa':
                const { empresaId: empId } = payload

                // Verificar se tem assinaturas ativas
                const { data: assinaturasAtivas, error: checkError } = await supabaseAdmin
                    .from('assinaturas')
                    .select('id')
                    .eq('empresa_id', empId)
                    .eq('status', 'ativo')

                if (checkError) throw checkError

                if (assinaturasAtivas && assinaturasAtivas.length > 0) {
                    throw new Error('Não é possível excluir empresa com assinaturas ativas. Cancele a assinatura primeiro.')
                }

                // Usar RPC para exclusão em cascata
                const { error: rpcError } = await supabaseAdmin
                    .rpc('delete_empresa_cascade', { emp_id: empId })

                if (rpcError) throw rpcError
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
