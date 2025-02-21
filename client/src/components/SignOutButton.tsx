'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { signOut } from '@/app/login/actions'
import { useRouter } from 'next/navigation'

export function SignOutButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    try {
      setIsLoading(true)
      const result = await signOut()
      if (result.success) {
        router.push('/login')
      }
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      onClick={handleSignOut}
      disabled={isLoading}
      variant="outline"
    >
      {isLoading ? (
        <>
          <span className="animate-spin">⚪</span>
          Signing out...
        </>
      ) : (
        'Sign out'
      )}
    </Button>
  )
} 