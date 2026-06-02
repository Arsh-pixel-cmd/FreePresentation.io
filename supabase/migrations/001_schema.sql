-- =============================================================
-- FreePresentation.io — Supabase Database Schema
-- Run this in Supabase Dashboard → SQL Editor
-- =============================================================

-- 1. Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Presentations table
create table if not exists public.presentations (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  topic text,
  theme_id text not null default 'obsidian',
  slides jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.presentations enable row level security;

create policy "Users can view own presentations"
  on public.presentations for select using (auth.uid() = user_id);

create policy "Users can create own presentations"
  on public.presentations for insert with check (auth.uid() = user_id);

create policy "Users can update own presentations"
  on public.presentations for update using (auth.uid() = user_id);

create policy "Users can delete own presentations"
  on public.presentations for delete using (auth.uid() = user_id);

-- Auto-update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create or replace trigger set_updated_at
  before update on public.presentations
  for each row execute procedure public.update_updated_at_column();

-- 3. Storage bucket for presentation assets (PDFs, images)
-- Run this in Supabase Dashboard → Storage → New Bucket
-- Bucket name: presentation-assets
-- Public: true
