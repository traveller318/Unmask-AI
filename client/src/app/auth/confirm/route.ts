import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Creating a handler to a GET request to route /auth/confirm
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    const next = '/dashboard'

    if (!token_hash || !type) {
      throw new Error('Missing token_hash or type')
    }

    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    })

    if (error) {
      throw new Error(error.message)
    }

    // Successful verification
    return NextResponse.redirect(new URL(next, request.url))
  } catch (error) {
    // Return to login with error message
    return NextResponse.redirect(
      new URL('/login?message=Could not verify email. Please try again.', request.url)
    )
  }
}