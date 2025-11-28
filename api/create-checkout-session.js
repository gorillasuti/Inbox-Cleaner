import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15',
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // In production, replace '*' with your extension ID like 'chrome-extension://...'
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

    const { priceId, extensionId } = req.body;

    // 1. Get or create customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabaseUUID: user.id,
        },
      });
      customerId = customer.id;

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // 2. Get Price Details to determine mode
    const targetPriceId = priceId || 'price_1SXUMCRVsfT7jfFtdvtBo8mg';
    const priceObj = await stripe.prices.retrieve(targetPriceId);

    if (!priceObj) {
      throw new Error('Price not found');
    }

    const mode = priceObj.type === 'recurring' ? 'subscription' : 'payment';

    // 3. Create Checkout Session
    // We use a middleman function to handle the redirect safely to chrome-extension://
    // In Vercel, this will be another API route or the same domain
    // Assuming the app is deployed at https://inbox-cleaner.vercel.app (or similar)
    // We can use relative paths for the redirect if on the same domain, but Stripe needs absolute URLs.
    // For now, we'll construct it based on the request host or an env var.
    
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}/api/payment-complete`;
    
    const successRedirect = `${baseUrl}?extension_id=${extensionId || 'missing'}&status=success`;
    const cancelRedirect = `${baseUrl}?extension_id=${extensionId || 'missing'}&status=cancel`;

    const session = await stripe.checkout.sessions.create({
      client_reference_id: user.id,
      customer: customerId,
      line_items: [
        {
          price: targetPriceId,
          quantity: 1,
        },
      ],
      mode: mode,
      success_url: successRedirect,
      cancel_url: cancelRedirect,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Error in create-checkout-session:', error);
    return res.status(400).json({ error: error.message });
  }
}
