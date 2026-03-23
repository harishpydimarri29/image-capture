-- Create invoices table
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phone_number text,
  date date,
  route text,
  total_amount numeric,
  profit numeric,
  tags text[] default '{}',
  front_image_path text not null,
  back_image_path text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.invoices enable row level security;

-- Users can only see their own invoices
create policy "Users can view own invoices"
  on public.invoices for select
  using (auth.uid() = user_id);

-- Users can insert their own invoices
create policy "Users can insert own invoices"
  on public.invoices for insert
  with check (auth.uid() = user_id);

-- Users can update their own invoices
create policy "Users can update own invoices"
  on public.invoices for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can delete their own invoices
create policy "Users can delete own invoices"
  on public.invoices for delete
  using (auth.uid() = user_id);

-- Create index for common search patterns
create index idx_invoices_user_id on public.invoices(user_id);
create index idx_invoices_date on public.invoices(date);
create index idx_invoices_route on public.invoices(route);
create index idx_invoices_tags on public.invoices using gin(tags);

-- Create storage bucket for invoice images
insert into storage.buckets (id, name, public)
  values ('invoice-images', 'invoice-images', false)
  on conflict (id) do nothing;

-- Storage policy: authenticated users can upload to their own folder
create policy "Users can upload invoice images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'invoice-images'
    and name like (auth.uid()::text || '/%')
  );

-- Storage policy: users can view their own images
create policy "Users can view own invoice images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'invoice-images'
    and name like (auth.uid()::text || '/%')
  );

-- Storage policy: users can delete their own images
create policy "Users can delete own invoice images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'invoice-images'
    and name like (auth.uid()::text || '/%')
  );
