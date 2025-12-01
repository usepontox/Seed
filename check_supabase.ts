
import { supabase } from "./src/integrations/supabase/client";

console.log("Supabase client:", supabase);
console.log("Supabase functions:", supabase.functions);

if (supabase.functions && typeof supabase.functions.invoke === 'function') {
    console.log("supabase.functions.invoke is available");
} else {
    console.error("supabase.functions.invoke is MISSING");
    process.exit(1);
}
