'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export function UploadBackImage({ invoiceId }: { invoiceId: string }) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.')
      return
    }

    setUploading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('You must be logged in.')
        return
      }

      const sanitize = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const backPath = `${user.id}/${Date.now()}_back_${sanitize(file.name)}`

      const { error: uploadError } = await supabase.storage
        .from('invoice-images')
        .upload(backPath, file, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`)
        return
      }

      const { error: updateError } = await supabase
        .from('invoices')
        .update({ back_image_path: backPath })
        .eq('id', invoiceId)

      if (updateError) {
        toast.error(`Failed to save: ${updateError.message}`)
        return
      }

      toast.success('Back image uploaded.')
      router.refresh()
    } catch {
      toast.error('An unexpected error occurred.')
    } finally {
      setUploading(false)
    }
  }, [invoiceId, router])

  return (
    <label className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 bg-muted/30 transition-colors hover:border-muted-foreground/50 hover:bg-muted/50">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      {uploading ? (
        <>
          <Loader2 className="mb-1.5 h-6 w-6 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Uploading...</span>
        </>
      ) : (
        <>
          <ImagePlus className="mb-1.5 h-6 w-6 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Add back</span>
          <span className="mt-0.5 text-[10px] text-muted-foreground">Tap to capture</span>
        </>
      )}
    </label>
  )
}
