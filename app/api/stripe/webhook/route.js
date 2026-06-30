import Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase-server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/stripe/webhook
// Configure this URL in your Stripe Dashboard (Developers -> Webhooks) and
// set STRIPE_WEBHOOK_SECRET to the signing secret it gives you.
//
// Handles:
//   account.updated     -> mark affiliate onboarded once payouts are enabled
//   transfer.failed     -> roll the payout + its conversions back to 'failed'/'approved'
export async function POST(req) {
  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const body = await req.text(); // raw body required for signature verification
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return Response.json({ ok: false, error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const sb = createServiceClient();

  try {
    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object;
        const onboarded = account.payouts_enabled === true && account.details_submitted === true;
        await sb
          .from('profiles')
          .update({ stripe_connect_onboarded: onboarded })
          .eq('stripe_connect_account_id', account.id);
        break;
      }

      case 'transfer.failed': {
        const transfer = event.data.object;
        const { data: payout } = await sb
          .from('payouts')
          .select('id, conversion_ids')
          .eq('stripe_transfer_id', transfer.id)
          .maybeSingle();

        if (payout) {
          await sb.from('payouts').update({ status: 'failed' }).eq('id', payout.id);
          // Return the conversions to 'approved' so they can be retried.
          if (payout.conversion_ids?.length) {
            await sb
              .from('referral_conversions')
              .update({ status: 'approved' })
              .in('id', payout.conversion_ids);
          }
        }
        break;
      }

      default:
        // Unhandled event types are acknowledged so Stripe stops retrying.
        break;
    }

    return Response.json({ received: true });
  } catch (e) {
    console.error('Stripe webhook handler error:', e);
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
