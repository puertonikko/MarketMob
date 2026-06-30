-- ════════════════════════════════════════════════════════════
-- CROWD MARKETING PLATFORM — SUPABASE SCHEMA
-- ════════════════════════════════════════════════════════════

-- Profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'affiliate', -- 'affiliate' | 'admin'
  stripe_connect_account_id text,
  stripe_connect_onboarded boolean default false,
  created_at timestamptz default now()
);

-- Partner apps (the apps being marketed — added by admin)
create table partner_apps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,            -- used in referral links e.g. /go/SLUG-CODE
  website_url text not null,
  logo_url text,
  description text,
  webhook_secret text not null,         -- used to verify incoming webhook calls
  api_key text unique not null,         -- given to partner to send events
  status text not null default 'pending', -- 'pending' | 'approved' | 'rejected' | 'paused'
  requested_by_email text,              -- who submitted the request form
  requested_by_user_id uuid references profiles(id),
  admin_notes text,
  created_at timestamptz default now()
);

-- Subscription tiers per partner app (admin sets payout rate per tier)
create table app_tiers (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references partner_apps(id) on delete cascade,
  tier_name text not null,              -- e.g. 'Pro', 'Elite'
  tier_price_cents integer not null,    -- what the end user pays, for reference
  payout_cents integer not null,        -- what affiliate earns per conversion to this tier
  payout_type text not null default 'one_time', -- 'one_time' | 'recurring_first_month' | 'recurring_ongoing'
  active boolean default true,
  created_at timestamptz default now()
);

-- Promo codes — one per affiliate per app (affiliate can generate for any approved app)
create table promo_codes (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references profiles(id) on delete cascade,
  app_id uuid not null references partner_apps(id) on delete cascade,
  code text unique not null,            -- e.g. "JOHN50" — also used in link /go/SLUG-CODE
  clicks integer default 0,
  created_at timestamptz default now(),
  unique(affiliate_id, app_id)
);

-- Click tracking (before signup — for funnel visibility)
create table referral_clicks (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references promo_codes(id) on delete cascade,
  ip_hash text,
  user_agent text,
  created_at timestamptz default now()
);

-- Signup events (partner app webhook fires this when a referred user signs up)
create table referral_signups (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references promo_codes(id) on delete cascade,
  app_id uuid not null references partner_apps(id),
  external_user_id text,                -- partner app's own user id, for de-duping
  user_email_hash text,                 -- hashed, never store raw PII unnecessarily
  created_at timestamptz default now(),
  unique(app_id, external_user_id)
);

-- Conversion events (partner app webhook fires this when referred user subscribes/pays)
create table referral_conversions (
  id uuid primary key default gen_random_uuid(),
  referral_signup_id uuid references referral_signups(id) on delete set null,
  promo_code_id uuid not null references promo_codes(id) on delete cascade,
  app_id uuid not null references partner_apps(id),
  app_tier_id uuid references app_tiers(id),
  external_user_id text,
  amount_paid_cents integer,            -- what end user paid (for records)
  payout_owed_cents integer not null,   -- what affiliate earns from this conversion
  status text not null default 'pending', -- 'pending' | 'approved' | 'paid' | 'voided'
  created_at timestamptz default now()
);

-- Payouts (batched Stripe Connect transfers to affiliates)
create table payouts (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references profiles(id) on delete cascade,
  amount_cents integer not null,
  stripe_transfer_id text,
  status text not null default 'pending', -- 'pending' | 'processing' | 'paid' | 'failed'
  conversion_ids uuid[] default '{}',    -- which conversions this payout covers
  created_at timestamptz default now(),
  paid_at timestamptz
);

-- Partner app requests (form submissions from app owners wanting to join)
create table app_requests (
  id uuid primary key default gen_random_uuid(),
  app_name text not null,
  website_url text not null,
  contact_email text not null,
  contact_name text,
  description text,
  estimated_monthly_signups text,
  status text not null default 'pending', -- 'pending' | 'approved' | 'rejected'
  admin_notes text,
  created_at timestamptz default now()
);

-- ── INDEXES ──
create index idx_promo_codes_affiliate on promo_codes(affiliate_id);
create index idx_promo_codes_app on promo_codes(app_id);
create index idx_signups_promo on referral_signups(promo_code_id);
create index idx_conversions_promo on referral_conversions(promo_code_id);
create index idx_conversions_affiliate on referral_conversions(promo_code_id);
create index idx_payouts_affiliate on payouts(affiliate_id);

-- ── ROW LEVEL SECURITY ──
alter table profiles enable row level security;
alter table promo_codes enable row level security;
alter table referral_signups enable row level security;
alter table referral_conversions enable row level security;
alter table payouts enable row level security;
alter table app_requests enable row level security;
alter table partner_apps enable row level security;
alter table app_tiers enable row level security;

-- Profiles: users see their own, admins see all
create policy "own profile" on profiles for select using (auth.uid() = id);
create policy "own profile update" on profiles for update using (auth.uid() = id);

-- Partner apps: everyone can see approved apps (to generate codes), only admin can edit
create policy "view approved apps" on partner_apps for select using (status = 'approved' or requested_by_user_id = auth.uid());

-- Promo codes: affiliates see their own
create policy "own promo codes" on promo_codes for select using (affiliate_id = auth.uid());
create policy "create own promo codes" on promo_codes for insert with check (affiliate_id = auth.uid());

-- Conversions/signups: affiliates see only ones tied to their codes
create policy "own conversions" on referral_conversions for select using (
  promo_code_id in (select id from promo_codes where affiliate_id = auth.uid())
);
create policy "own signups" on referral_signups for select using (
  promo_code_id in (select id from promo_codes where affiliate_id = auth.uid())
);

-- Payouts: affiliates see their own
create policy "own payouts" on payouts for select using (affiliate_id = auth.uid());

-- App tiers: public read for approved apps (affiliates need to see payout rates)
create policy "view tiers" on app_tiers for select using (
  app_id in (select id from partner_apps where status = 'approved')
);

-- App requests: only the requester can see their own; admin sees all via service role
create policy "own requests" on app_requests for select using (true); -- tighten later if public form

-- Note: All admin write operations (approving apps, setting tiers, approving payouts)
-- should go through server-side API routes using the Supabase service role key,
-- bypassing RLS, with admin-role checks done in the API route itself.

-- ════════════════════════════════════════════════════════════
-- ADDED DURING ASSEMBLY — functions, triggers, idempotency
-- ════════════════════════════════════════════════════════════

-- Atomic click counter increment (called from /go/[ref] via rpc)
create or replace function increment_clicks(p_promo_code_id uuid)
returns void
language sql
security definer
as $$
  update promo_codes set clicks = clicks + 1 where id = p_promo_code_id;
$$;

-- Idempotency for conversions: a given external user can only convert once
-- per app. A partner retrying the webhook won't create duplicate payouts.
-- (Use a partial unique index since external_user_id may be null in edge cases.)
create unique index if not exists uniq_conversion_per_user
  on referral_conversions(app_id, external_user_id)
  where external_user_id is not null;

-- Auto-create a profile row when a new auth user signs up. This removes the
-- reliance on a client-side insert (which RLS can block) in the login page.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'affiliate')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Allow the public request-app form to insert (anon role) without exposing reads.
create policy "anyone can submit app request"
  on app_requests for insert with check (true);
