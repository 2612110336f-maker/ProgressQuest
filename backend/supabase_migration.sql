-- ProgressQuest: SQLite -> Supabase (PostgreSQL) 移行用DDL
-- backend/models.py のスキーマに対応
-- Supabaseダッシュボードの SQL Editor でそのまま実行してください

-- pgcrypto は gen_random_uuid() に必要（Supabaseではデフォルトで有効なことが多いですが念のため）
create extension if not exists pgcrypto;

-- ============================
-- users
-- ============================
create table if not exists users (
    id              text primary key default gen_random_uuid()::text,
    email           text not null unique,
    hashed_password text not null,
    line_user_id    text,
    line_link_code  text,
    created_at      timestamptz not null default now()
);

create unique index if not exists users_line_user_id_key
    on users (line_user_id)
    where line_user_id is not null;

-- ============================
-- quests
-- ============================
create table if not exists quests (
    id                  text primary key default gen_random_uuid()::text,
    user_id             text not null references users (id) on delete cascade,
    title               text not null,
    description         text,
    original_deadline   date,
    final_deadline      date,
    diagnosis_result    jsonb,
    created_at          timestamptz not null default now(),
    archived_at         timestamptz
);

create index if not exists quests_user_id_idx
    on quests (user_id);

-- ============================
-- checkpoints
-- ============================
create table if not exists checkpoints (
    id              text primary key default gen_random_uuid()::text,
    quest_id        text not null references quests (id) on delete cascade,
    title           text not null,
    description     text,
    due_date        date,
    completed_at    timestamptz,
    order_index     integer,
    estimated_hours integer
);

create index if not exists checkpoints_quest_id_idx
    on checkpoints (quest_id);

-- main.py の期日超過チェック（未完了 かつ due_date < today）を高速化する部分インデックス
create index if not exists checkpoints_overdue_idx
    on checkpoints (quest_id, due_date)
    where completed_at is null;

-- ============================
-- Row Level Security
-- Supabaseはpublicスキーマのテーブルをデフォルトで PostgREST 経由で公開するため、
-- バックエンドがDATABASE_URL（DBオーナー/service role権限）経由で直接アクセスする構成でも
-- 念のためRLSを有効化し、anon/authenticatedキー経由でのアクセスを塞いでおく。
-- ============================
alter table users enable row level security;
alter table quests enable row level security;
alter table checkpoints enable row level security;

-- ポリシーを何も作らなければ anon/authenticated からは一切アクセス不可（service_role/DBオーナーは常にバイパス）
