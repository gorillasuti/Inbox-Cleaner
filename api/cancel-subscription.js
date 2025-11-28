import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15',
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    // Get subscription ID from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_subscription_id) {
      throw new Error('No active subscription found');
    }

    // Cancel at period end (prevent immediate cutoff)
    const subscription = await stripe.subscriptions.update(
      profile.stripe_subscription_id,
      { cancel_at_period_end: true }
    );

    console.log("Stripe subscription updated:", JSON.stringify(subscription, null, 2));

    // Update Supabase immediately so UI reflects change without waiting for webhook
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ cancel_at_period_end: true })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update Supabase profile:', updateError);
      // We don't fail the request because Stripe was successful, but we log it
    }

    return res.status(200).json({ 
      status: 'canceled', 
      cancel_at: subscription.cancel_at 
    });
  } catch (error) {
    console.error('Error in cancel-subscription:', error);
    return res.status(400).json({ error: error.message });
  }
}
