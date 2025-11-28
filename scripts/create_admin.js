
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY; // Using publishable key for client-side signup simulation, or service role if available.
// Actually, to bypass email confirmation we might need service role, but let's try normal signup first. 
// If we don't have service role key in env, we can't auto-confirm. 
// Let's check if we have a service role key. Usually it's not in .env for frontend.
// If not, I will try to insert via SQL if I can generate a hash, or just use the client and tell user to confirm (or disable confirmation in dashboard).
// Wait, I can use the MCP tool to execute SQL. I can insert into auth.users if I can generate a valid hash. 
// But generating a valid bcrypt hash in SQL is hard without pgcrypto. 
// Let's try to use the 'service_role' key if the user has it. 
// The user only showed VITE_ variables. 
// I will try to use the signup method.

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
    const { data, error } = await supabase.auth.signUp({
        email: 'admin@admin.com',
        password: '123456',
        options: {
            data: {
                nome: 'Administrador',
                role: 'admin'
            }
        }
    });

    if (error) {
        console.error('Error creating user:', error.message);
    } else {
        console.log('User created successfully:', data.user?.email);
        console.log('NOTE: If email confirmation is enabled, you may need to confirm the email or disable confirmation in the Supabase dashboard.');
    }
}

createAdmin();
