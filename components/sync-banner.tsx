'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Cloud, CloudOff, Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { getPendingCount } from '@/lib/offline-store'
import { syncPendingUploads } from '@/lib/sync-uploads'

export function SyncBanner() {
  const [online, setOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(null)
  const syncingRef = useRef(false)

  const refreshCount = useCallback(async () => {
    try {
      const count = await getPendingCount()
      setPendingCount(count)
    } catch {
      // IndexedDB not available
    }
  }, [])

  const doSync = useCallback(async () => {
    if (syncingRef.current) return
    syncingRef.current = true
    setSyncing(true)

    try {
      const result = await syncPendingUploads()
      if (result.synced > 0) {
        toast.success(`Synced ${result.synced} offline upload${result.synced > 1 ? 's' : ''}`)
        setLastSyncResult(`${result.synced} synced`)
        setTimeout(() => setLastSyncResult(null), 3000)
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} upload${result.failed > 1 ? 's' : ''} failed to sync`)
      }
    } catch (err) {
      console.error('[sync] Sync error:', err)
    } finally {
      syncingRef.current = false
      setSyncing(false)
      await refreshCount()
    }
  }, [refreshCount])

  useEffect(() => {
    setOnline(navigator.onLine)
    refreshCount()

    const handleOnline = () => {
      setOnline(true)
      toast.info('Back online')
      doSync()
    }

    const handleOffline = () => {
      setOnline(false)
      toast.warning('You are offline. Uploads will be saved locally.')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const handleNewPending = () => refreshCount()
    window.addEventListener('pending-upload-added', handleNewPending)

    if (navigator.onLine) {
      getPendingCount().then((c) => {
        if (c > 0) doSync()
      })
    }

    const interval = setInterval(() => {
      refreshCount()
      if (navigator.onLine) {
        getPendingCount().then((c) => {
          if (c > 0 && !syncingRef.current) doSync()
        })
      }
    }, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('pending-upload-added', handleNewPending)
      clearInterval(interval)
    }
  }, [doSync, refreshCount])

  if (online && pendingCount === 0 && !lastSyncResult) return null

  return (
    <div className="border-b bg-muted/50 px-4 py-1.5">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 text-xs">
        {!online ? (
          <>
            <CloudOff className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-orange-700">
              Offline
              {pendingCount > 0 && ` \u00b7 ${pendingCount} pending upload${pendingCount > 1 ? 's' : ''}`}
            </span>
          </>
        ) : syncing ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span className="text-muted-foreground">Syncing uploads...</span>
          </>
        ) : lastSyncResult ? (
          <>
            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
            <span className="text-green-700">{lastSyncResult}</span>
          </>
        ) : pendingCount > 0 ? (
          <>
            <Cloud className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">
              {pendingCount} pending upload{pendingCount > 1 ? 's' : ''} \u00b7 syncing shortly...
            </span>
          </>
        ) : null}
      </div>
    </div>
  )
}
