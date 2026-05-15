'use client'

import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { LogOut, RefreshCw } from 'lucide-react'

export function WaitingActions() {
  const router = useRouter()
  const [checking, setChecking] = useState(false)

  async function handleRefresh() {
    setChecking(true)
    try {
      const res = await fetch('/api/me/status')
      if (res.ok) {
        const data = await res.json()
        if (data.status === 'approved') {
          router.push('/create')
          return
        }
      }
      router.refresh()
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" className="flex-1" onClick={handleRefresh} disabled={checking}>
        <RefreshCw className={`mr-2 h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
        {checking ? 'Checking…' : 'Refresh'}
      </Button>
      <Button
        variant="ghost"
        className="flex-1"
        onClick={() => signOut({ callbackUrl: '/login' })}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sign out
      </Button>
    </div>
  )
}
