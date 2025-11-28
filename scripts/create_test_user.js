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

async function createTestUser() {
    const { data, error } = await supabase.auth.signUp({
        email: 'teste@teste.com',
        password: '123456',
        options: {
            data: {
                nome: 'Usuário Teste',
                role: 'admin'
            }
        }
    });

    if (error) {
        console.error('Error creating test user:', error.message);
    } else {
        console.log('✅ Test user created successfully!');
        console.log('Email:', data.user?.email);
        console.log('User ID:', data.user?.id);
        console.log('\nCredentials:');
        console.log('Email: teste@teste.com');
        console.log('Password: 123456');
    }
}

createTestUser();
