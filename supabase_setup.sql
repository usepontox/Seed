-- Rode este script no Editor SQL do seu Painel Supabase (https://supabase.com/dashboard/project/lwkuqpgjtpydlgaeiybg/sql)

-- 1. Cria o bucket 'avatars' se não existir
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2. Permite acesso público para visualização (SELECT)
create policy "Public Access" 
on storage.objects for select 
using ( bucket_id = 'avatars' );

-- 3. Permite upload para usuários autenticados (INSERT)
create policy "Authenticated Upload" 
on storage.objects for insert 
with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

-- 4. Permite atualização do próprio avatar (UPDATE) - Opcional, mas recomendado
create policy "Owner Update" 
on storage.objects for update
using ( bucket_id = 'avatars' and auth.uid() = owner );
