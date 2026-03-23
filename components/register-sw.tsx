'use client'

import { useEffect } from 'react'

export function RegisterServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    if (process.env.NODE_ENV === 'development') {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((r) => r.unregister())
      })
      return
    }

    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('[sw] Registration failed:', err)
    })
  }, [])

  return null
}
