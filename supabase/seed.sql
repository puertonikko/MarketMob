-- ════════════════════════════════════════════════════════════
-- MarketMob — seed partner apps + tiers
-- Run once in the Supabase SQL Editor (safe to re-run: idempotent).
-- ════════════════════════════════════════════════════════════

-- Synaptic Quant is LIVE (approved → visible to marketers, links redirect).
-- MobiCard is PREWIRED but PAUSED (hidden from marketers until you flip it
-- to 'approved'; its tracking is already in the app, just dormant).
insert into partner_apps (name, slug, website_url, description, api_key, webhook_secret, status)
values
  ('Synaptic Quant', 'synapticquant', 'https://synapticquant.com',
   'AI-powered autonomous trading bot.',
   'pk_bUJOpZNcwubf-DG9Geexy55Q', 'whsec_ECtF4g26wlUMj5_nyvQB0R5B5MykdXzG', 'approved'),
  ('MobiCard', 'mobicard', 'https://www.freemobicard.com',
   'Digital business card app.',
   'pk_pNad9l1IF_XNDgVnnwGbQIHt', 'whsec_H4S1V87ngKTJ8tWZNE7rYp1z1zmGhZIW', 'paused')
on conflict (slug) do update
  set name        = excluded.name,
      website_url = excluded.website_url,
      description = excluded.description,
      status      = excluded.status;

-- Tiers. payout_cents = what the MARKETER earns per approved conversion.
-- tier_name must match what the app's conversion webhook sends
-- (Synaptic Quant's Stripe handler sends 'pro' / 'elite').
insert into app_tiers (app_id, tier_name, tier_price_cents, payout_cents, payout_type, active)
select pa.id, t.tier_name, t.tier_price_cents, t.payout_cents, 'one_time', true
from partner_apps pa
join (values
  ('synapticquant', 'pro',   2000, 200),   -- user pays $20/mo → marketer earns $2
  ('synapticquant', 'elite', 4000, 400),   -- user pays $40/mo → marketer earns $4
  ('mobicard',      'pro',      0,  50)     -- marketer earns $0.50 (price TBD)
) as t(slug, tier_name, tier_price_cents, payout_cents) on t.slug = pa.slug
where not exists (
  select 1 from app_tiers ex where ex.app_id = pa.id and ex.tier_name = t.tier_name
);
