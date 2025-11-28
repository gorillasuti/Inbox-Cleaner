import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { buffer } from 'micro';

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15',
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const signature = req.headers['stripe-signature'];
  let event;

  try {
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(
      buf,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        const clientReferenceId = session.client_reference_id;

        console.log(`[Webhook] Processing checkout.session.completed for customer: ${customerId}, client_ref: ${clientReferenceId}`);

        let profile;

        // 1. Try finding by client_reference_id (Most reliable)
        if (clientReferenceId) {
          const { data } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', clientReferenceId)
            .single();
          profile = data;
        }

        // 2. Fallback to stripe_customer_id
        if (!profile && customerId) {
          const { data } = await supabase
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single();
          profile = data;
        }

        // Fetch subscription details to get the end date
        let subscriptionEndDate = null;
        let cancelAtPeriodEnd = false;
        if (subscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            subscriptionEndDate = new Date(subscription.current_period_end * 1000).toISOString();
            cancelAtPeriodEnd = subscription.cancel_at_period_end;
          } catch (err) {
            console.error(`[Webhook] Failed to retrieve subscription ${subscriptionId}:`, err);
          }
        }

        if (profile) {
          await supabase
            .from('profiles')
            .update({
              subscription_status: 'active',
              is_premium: true,
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: customerId,
              subscription_end_date: subscriptionEndDate,
              cancel_at_period_end: cancelAtPeriodEnd,
              has_been_premium: true // Mark as having been premium
            })
            .eq('id', profile.id);
          console.log(`[Webhook] Updated profile ${profile.id} to premium`);
        } else {
          console.error(`[Webhook] Profile not found for customer: ${customerId}`);
        }
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const status = subscription.status;
        const cancelAtPeriodEnd = subscription.cancel_at_period_end;
        const subscriptionEndDate = new Date(subscription.current_period_end * 1000).toISOString();

        console.log(`[Webhook] Processing subscription update for customer: ${customerId}, status: ${status}, cancel_at_period_end: ${cancelAtPeriodEnd}`);

        const updateData = {
          subscription_status: status,
          is_premium: status === 'active' || status === 'trialing',
          subscription_end_date: subscriptionEndDate,
          cancel_at_period_end: cancelAtPeriodEnd
        };

        // If becoming active, ensure has_been_premium is true
        if (status === 'active') {
            updateData.has_been_premium = true;
        }

        await supabase
          .from('profiles')
          .update(updateData)
          .eq('stripe_customer_id', customerId);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        await supabase
          .from('profiles')
          .update({ 
            subscription_status: 'canceled',
            is_premium: false,
            cancel_at_period_end: false,
            has_seen_welcome: false // Reset welcome so they see "Welcome Back" on resubscribe
          })
          .eq('stripe_customer_id', customerId);
        break;
      }
    }
  } catch (err) {
    console.error('Error processing webhook:', err);
    return res.status(500).send(`Error processing webhook: ${err.message}`);
  }

  res.status(200).json({ received: true });
}
