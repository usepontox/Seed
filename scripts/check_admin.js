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

async function checkAndCreateAdmin() {
    const email = 'admin@admin.com';
    const password = 'admin123'; // Senha com min 6 caracteres

    // Tentar login para verificar se existe
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (!signInError && signInData.user) {
        console.log('✅ Usuário admin@admin.com já existe!');
        console.log('User ID:', signInData.user.id);
        return;
    }

    console.log('Usuário não encontrado ou senha incorreta. Tentando criar...');

    // Criar usuário
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                nome: 'Administrador',
                role: 'admin'
            }
        }
    });

    if (error) {
        console.error('Erro ao criar usuário admin:', error.message);
    } else {
        console.log('✅ Usuário admin@admin.com criado com sucesso!');
        console.log('Email:', email);
        console.log('Senha:', password);
    }
}

checkAndCreateAdmin();
