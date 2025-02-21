'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function emailLogin(formData: FormData) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient()

    const { error, data: authData } = await supabase.auth.signInWithPassword({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    })

    if (error) {
      return { error: error.message }
    }

    if (!authData.session) {
      return { error: 'No session created' }
    }

    // Supabase client will automatically handle setting the cookies
    revalidatePath('/', 'layout')
    return { success: true, redirectTo: '/dashboard' }
  } catch (err) {
    console.error('Login error:', err)
    return { error: 'An error occurred during login' }
  }
}

export async function signup(formData: FormData) {
  try {
    const supabase = await createClient()

    const data = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    }

    const { error, data: authData } = await supabase.auth.signUp({
      ...data,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    })

    if (error) {
      return { error: error.message }
    }

    // Check if the user needs to confirm their email
    if (!authData.user || authData.user.identities?.length === 0) {
      return { error: 'This email is already registered. Please log in instead.' }
    }

    // If we get here, signup was successful
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err) {
    console.error('Signup error:', err)
    return { error: 'An error occurred during signup' }
  }
}

export async function signOut() {
  const supabase = await createClient()
  
  try {
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error) {
    console.error('Error signing out:', error)
    return { error: 'Error signing out' }
  }
}

export async function signInWithGithub() {
  const supabase = await createClient()
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      scopes: 'read:user user:email',
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Check if we have a URL to redirect to
  if (data?.url) {
    return { url: data.url }
  }

  return { error: 'No redirect URL provided' }
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Check if we have a URL to redirect to
  if (data?.url) {
    return { url: data.url }
  }

  return { error: 'No redirect URL provided' }
}