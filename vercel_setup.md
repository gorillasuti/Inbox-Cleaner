# Vercel Configuration & Comparison

## Environment Variables

You need to add the following environment variables to your Vercel Project
Settings (**Settings** > **Environment Variables**).

| Variable Name               | Description                                              | Where to find it                                                                                                                                     |
| :-------------------------- | :------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`         | Stripe Secret Key (starts with `sk_test_` or `sk_live_`) | **Stripe Dashboard** > Developers > API keys                                                                                                         |
| `STRIPE_WEBHOOK_SECRET`     | Stripe Webhook Signing Secret (starts with `whsec_`)     | **Stripe Dashboard** > Developers > Webhooks (You need to create a new endpoint pointing to `https://your-vercel-url.vercel.app/api/stripe-webhook`) |
| `SUPABASE_URL`              | Your Supabase Project URL                                | **Supabase Dashboard** > Project Settings > API                                                                                                      |
| `SUPABASE_ANON_KEY`         | Public Anon Key                                          | **Supabase Dashboard** > Project Settings > API                                                                                                      |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key (Keep this secret!)                     | **Supabase Dashboard** > Project Settings > API                                                                                                      |

> [!IMPORTANT]
> After adding these variables, you might need to **Redeploy** in Vercel
> (Deployments > Redeploy) for them to take effect.

---

## Vercel (Node.js) vs. Supabase Edge Functions (Deno)

You asked why Vercel might be a better or worse choice than Deno. Here is a
breakdown:

### ✅ Why Vercel (Node.js) is often "Better" (Easier)

1. **NPM Ecosystem**: Vercel uses standard Node.js, so you can `npm install` any
   package (like `stripe`, `micro`, `googleapis`) and it just works. Deno
   requires special handling for npm packages (using `esm.sh` or import maps),
   which caused the "Cannot find module" errors you saw earlier.
2. **Compatibility**: Most libraries and tutorials are written for Node.js. You
   don't need to worry about "Deno compatibility" or polyfills.
3. **Tooling**: You can use standard tools like ESLint, Prettier, and Jest
   without extra configuration.
4. **Debugging**: Vercel logs are generally easier to read and filter than
   Supabase Edge Function logs.

### ❌ Why Vercel might be "Worse" (Trade-offs)

1. **Latency**: Supabase Edge Functions run _very_ close to your database (if in
   the same region), often resulting in slightly faster database operations.
   Vercel functions might add a few milliseconds of latency if they are hosted
   in a different region than your Supabase DB.
2. **Cold Starts**: Vercel Serverless Functions can have "cold starts" (taking a
   second or two to spin up if not used recently). Supabase Edge Functions
   (Deno) are designed to have near-instant startup times.
3. **Cost**: Both have generous free tiers, but for very high scale, their
   pricing models differ.

**Verdict for this Project**: **Vercel is the better choice here.** The ease of
using the standard `stripe` and `supabase-js` libraries via npm outweighs the
minor latency benefits of Deno, especially since we encountered significant
friction with Deno's module resolution.

---

## Next Steps

1. **Configure the Env Vars** in Vercel as listed above.
2. **Update Local `.env`**: Create or update the `.env` file in your project
   root:
   ```env
   VITE_API_URL=https://inbox-cleaner-fgpdiudv3-kiralydaniel517-gmailcoms-projects.vercel.app
   ```
3. **Rebuild Extension**:
   ```bash
   npm run build
   ```
