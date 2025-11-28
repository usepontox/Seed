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

async function testEdgeFunction() {
    const email = 'admin@admin.com';
    const password = '07192029Rajj@@';

    // 1. Login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (authError) {
        console.error('Erro ao logar:', authError.message);
        return;
    }

    console.log('Logado como admin.');

    // 2. Invoke Function - List Users
    console.log('Testando listUsers...');
    console.log('Testando listAssinaturas...');
    const { data: assinaturas, error: assError } = await supabase.functions.invoke('admin-users', {
        body: { action: 'listAssinaturas' }
    });

    if (assError) {
        console.error('Erro em listAssinaturas:', assError);
    } else {
        console.log('listAssinaturas OK. Total:', assinaturas.length);
    }
}

testEdgeFunction();
