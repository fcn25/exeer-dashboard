/**
 * Tap Payments integration placeholder.
 *
 * When wiring Tap:
 * 1. Add VITE_TAP_PUBLIC_KEY (checkout) to .env — never commit secrets.
 * 2. Create a Supabase Edge Function (or backend) that charges with TAP_SECRET_KEY.
 * 3. On success, update companies.plan_status = 'active' and extend trial_ends_at / billing period.
 */

// import Tap from '@tap-payments/gosell'; // future SDK

/**
 * Initiates Tap checkout for the current company subscription.
 * @returns {Promise<{ ok: boolean, redirectUrl?: string }>}
 */
export async function handleTapPayment() {
  // TODO: Inject Tap Payments merchant ID / public key from import.meta.env.VITE_TAP_PUBLIC_KEY
  // TODO: Build charge payload (amount, currency SAR, customer email, metadata.company_id)
  // TODO: Open Tap GoSell SDK or redirect to Tap hosted checkout URL
  // TODO: Handle webhook / return URL to confirm payment and update `companies` in Supabase

  await new Promise((resolve) => {
    window.setTimeout(resolve, 400);
  });

  return {
    ok: false,
    message: "تكامل Tap Payments قيد الإعداد — سيتم تفعيل الدفع قريباً.",
  };
}
