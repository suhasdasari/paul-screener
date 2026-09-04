create table if not exists watchlist (
  user_id text not null,
  symbol text not null,
  name text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, symbol)
);
create index if not exists watchlist_user_id_idx on watchlist (user_id);
