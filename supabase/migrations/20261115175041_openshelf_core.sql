create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '' check(length(display_name)<=120),
 settings jsonb not null default '{}'
);
create table private.administrators (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table private.administrators enable row level security;
create function private.is_admin() returns boolean language sql stable security definer
set search_path = '' as $$ select auth.uid() is not null and exists(select 1 from private.administrators where user_id=auth.uid()) $$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;
create table public.categories (
 id uuid primary key default gen_random_uuid(),
 name text not null unique check(length(trim(name)) between 1 and 120)
);
create table public.books (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(trim(title)) between 1 and 300),
 author text not null default '' check(length(author)<=300),
 description text not null default '' check(length(description)<=20000),
 category_id uuid references public.categories(id) on delete set null,
 cover_url text check(cover_url is null or cover_url ~ '^https://'),
 r2_key text unique,
 file_size bigint check(file_size>0 and file_size<=52428800),
 status text not null default 'draft' check(status in ('draft','published')),
 created_at timestamptz not null default now(),
 check(status <> 'published' or (r2_key is not null and file_size is not null))
);
create table public.personal_books (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 drive_file_id text not null check(length(drive_file_id) between 1 and 200),
 title text not null check(length(title) between 1 and 300),
 author text not null default '',
 created_at timestamptz not null default now(),
 unique(user_id,drive_file_id), unique(id,user_id)
);
create table public.bookshelf (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 book_id uuid references public.books(id) on delete cascade,
 personal_book_id uuid,
 created_at timestamptz not null default now(),
 check(num_nonnulls(book_id,personal_book_id)=1),
 foreign key(personal_book_id,user_id) references public.personal_books(id,user_id) on delete cascade,
 unique(user_id,book_id), unique(user_id,personal_book_id), unique(id,user_id)
);
create table public.reading_progress (
 shelf_id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 cfi text not null check(length(cfi)<=4000),
 percentage numeric not null default 0 check(percentage between 0 and 100),
 updated_at timestamptz not null default now(),
 foreign key(shelf_id,user_id) references public.bookshelf(id,user_id) on delete cascade
);
create table public.annotations (
 id uuid primary key default gen_random_uuid(),
 shelf_id uuid not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('bookmark','highlight','note')),
 cfi text not null check(length(cfi)<=4000),
 excerpt text not null default '' check(length(excerpt)<=10000),
 note text not null default '' check(length(note)<=10000),
 created_at timestamptz not null default now(),
 foreign key(shelf_id,user_id) references public.bookshelf(id,user_id) on delete cascade
);
create table public.vocabulary (
 id uuid primary key default gen_random_uuid(),
 shelf_id uuid not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 word text not null check(length(trim(word)) between 1 and 120),
 context text not null default '' check(length(context)<=10000),
 definition text,
 source_url text,
 created_at timestamptz not null default now(),
 foreign key(shelf_id,user_id) references public.bookshelf(id,user_id) on delete cascade
);
alter table public.profiles enable row level security;
create policy profile_owner on public.profiles for all to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
alter table public.categories enable row level security;
create policy category_read on public.categories for select to anon,authenticated using(true);
create policy category_admin on public.categories for all to authenticated using((select private.is_admin())) with check((select private.is_admin()));
alter table public.books enable row level security;
create policy published_read on public.books for select to anon,authenticated using(status='published');
create policy book_admin on public.books for all to authenticated using((select private.is_admin())) with check((select private.is_admin()));
do $$ declare t text; begin
 foreach t in array array['personal_books','bookshelf','reading_progress','annotations','vocabulary'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy owner_access on public.%I for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()))',t);
 execute format('create index on public.%I(user_id)',t);
 end loop;
end $$;
grant select on public.books,public.categories to anon;
grant select,insert,update,delete on public.profiles,public.categories,public.books,public.personal_books,public.bookshelf,public.reading_progress,public.annotations,public.vocabulary to authenticated;
create index on public.books(category_id);
create index on public.bookshelf(book_id);
create index on public.bookshelf(personal_book_id,user_id);
create index on public.reading_progress(shelf_id,user_id);
create index on public.annotations(shelf_id,user_id);
create index on public.vocabulary(shelf_id,user_id);
