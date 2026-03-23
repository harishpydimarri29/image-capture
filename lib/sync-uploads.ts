import { createClient } from '@/lib/supabase/client'
import {
  getPendingUploads,
  updateUploadStatus,
  deletePendingUpload,
  type PendingUpload,
} from '@/lib/offline-store'

const MAX_RETRIES = 5

async function uploadOne(record: PendingUpload): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const sanitize = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const timestamp = record.createdAt

  const frontBlob = new Blob([record.frontImageData], { type: record.frontImageType })
  const frontPath = `${user.id}/${timestamp}_front_${sanitize(record.frontImageName)}`

  const { error: frontError } = await supabase.storage
    .from('invoice-images')
    .upload(frontPath, frontBlob, { cacheControl: '3600', upsert: false })

  if (frontError) {
    console.error(`[sync] Front upload failed for ${record.id}:`, frontError.message)
    return false
  }

  let backPath: string | null = null
  if (record.backImageData && record.backImageName && record.backImageType) {
    const backBlob = new Blob([record.backImageData], { type: record.backImageType })
    backPath = `${user.id}/${timestamp}_back_${sanitize(record.backImageName)}`

    const { error: backError } = await supabase.storage
      .from('invoice-images')
      .upload(backPath, backBlob, { cacheControl: '3600', upsert: false })

    if (backError) {
      console.error(`[sync] Back upload failed for ${record.id}:`, backError.message)
      return false
    }
  }

  const { error: insertError } = await supabase.from('invoices').insert({
    user_id: user.id,
    phone_number: record.metadata.phoneNumber || null,
    date: record.metadata.date || null,
    route: record.metadata.route || null,
    total_amount: record.metadata.totalAmount ? parseFloat(record.metadata.totalAmount) : null,
    profit: record.metadata.profit ? parseFloat(record.metadata.profit) : null,
    tags: record.metadata.tags,
    front_image_path: frontPath,
    back_image_path: backPath,
  })

  if (insertError) {
    console.error(`[sync] DB insert failed for ${record.id}:`, insertError.message)
    return false
  }

  return true
}

export interface SyncResult {
  synced: number
  failed: number
  remaining: number
}

export async function syncPendingUploads(): Promise<SyncResult> {
  const pending = await getPendingUploads()
  const actionable = pending.filter(
    (r) => r.status !== 'uploading' && r.retryCount < MAX_RETRIES
  )

  let synced = 0
  let failed = 0

  for (const record of actionable) {
    await updateUploadStatus(record.id, 'uploading')

    try {
      const success = await uploadOne(record)
      if (success) {
        await deletePendingUpload(record.id)
        synced++
      } else {
        await updateUploadStatus(record.id, 'failed', true)
        failed++
      }
    } catch (err) {
      console.error(`[sync] Unexpected error for ${record.id}:`, err)
      await updateUploadStatus(record.id, 'failed', true)
      failed++
    }
  }

  const remaining = pending.length - synced
  return { synced, failed, remaining }
}
