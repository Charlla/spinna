import { createClient } from '@supabase/supabase-js'
import { makeOTPFactory, renderOTPEmail, isValidEmail } from './otp-core'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export const otp = makeOTPFactory({
  table: 'spinna_otp_codes',
  getDb: getServiceClient,
})

export { renderOTPEmail, isValidEmail }
export { OTPRateLimitedError } from './otp-core'

const APP_NAME = 'Spinmfana'
const BRAND = '#fcd00b'
const FROM = process.env.EMAIL_FROM ?? 'noreply@spinmfana.com'

/** Send the OTP via Resend. Throws on send error. */
export async function sendOTPEmail(email: string, code: string): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY missing')
  const { subject, html, text } = renderOTPEmail(APP_NAME, code, BRAND)
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: email, subject, html, text }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend send failed: ${res.status} ${body.slice(0, 200)}`)
  }
}
