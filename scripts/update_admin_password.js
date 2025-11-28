import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePassword() {
    const email = 'admin@admin.com';
    const newPassword = '07192029Rajj@@';

    // Tentar senhas comuns antigas
    const oldPasswords = ['123456', 'admin', 'admin123'];
    let session = null;

    for (const password of oldPasswords) {
        console.log(`Tentando logar com senha: ${password}...`);
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (!error && data.session) {
            console.log('✅ Login realizado com sucesso!');
            session = data.session;
            break;
        }
    }

    if (!session) {
        console.error('❌ Não foi possível logar com nenhuma das senhas antigas conhecidas (123456, admin, admin123).');
        console.log('Por favor, verifique a senha atual.');
        return;
    }

    console.log('Atualizando para a nova senha...');

    const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
    });

    if (updateError) {
        console.error('❌ Erro ao atualizar senha:', updateError.message);
    } else {
        console.log('✅ Senha atualizada com sucesso para: 07192029Rajj@@');
    }
}

updatePassword();
