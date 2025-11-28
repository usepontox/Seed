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
    const { data: users, error: usersError } = await supabase.functions.invoke('admin-users', {
        body: { action: 'listUsers' }
    });

    if (usersError) {
        console.error('Erro em listUsers:', usersError);
        if (usersError.context && usersError.context.response) {
            const text = await usersError.context.response.text();
            console.error('Response Body:', text);
        }
    } else {
        console.log('listUsers OK. Total:', users ? users.length : 0);
    }

    console.log('Testando listAssinaturas via fetch...');
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const response = await fetch(`${supabaseUrl}/functions/v1/admin-users`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'listAssinaturas' })
    });

    if (!response.ok) {
        const text = await response.text();
        console.error('Erro fetch listAssinaturas:', response.status, text);
    } else {
        const data = await response.json();
        console.log('listAssinaturas OK via fetch. Total:', data.length);
    }
}

testEdgeFunction();
