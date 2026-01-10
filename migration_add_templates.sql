-- 1. Create set_templates table
create table if not exists public.set_templates (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  sets jsonb not null, -- Array of objects
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable RLS
alter table public.set_templates enable row level security;

-- 3. Create RLS Policies
drop policy if exists "Coaches can manage their own templates" on public.set_templates;
create policy "Coaches can manage their own templates"
  on public.set_templates
  using (auth.uid() = coach_id);

-- 4. Update set_type enum
-- The error indicated that 'set_type' is a proper ENUM type.
-- We must use ALTER TYPE to add new values.
-- We also add 'drop' just in case, as the error mentioned it was invalid context.

ALTER TYPE public.set_type ADD VALUE IF NOT EXISTS 'drop';
ALTER TYPE public.set_type ADD VALUE IF NOT EXISTS 'preparation';
