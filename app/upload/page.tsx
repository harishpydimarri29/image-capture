'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, X, CheckCircle, Plus, WifiOff, Wifi } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TagInput } from '@/components/ui/tag-input'
import { createClient } from '@/lib/supabase/client'
import { savePendingUpload } from '@/lib/offline-store'

function ImageDropzone({
  label,
  file,
  onFileSelect,
  onRemove,
}: {
  label: string
  file: File | null
  onFileSelect: (file: File) => void
  onRemove: () => void
}) {
  const [dragActive, setDragActive] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      const dropped = e.dataTransfer.files[0]
      if (dropped?.type.startsWith('image/')) {
        onFileSelect(dropped)
      }
    },
    [onFileSelect]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0]
      if (selected && selected.type.startsWith('image/')) {
        onFileSelect(selected)
      }
    },
    [onFileSelect]
  )

  if (file) {
    return (
      <div className="relative rounded-lg border bg-muted/30 p-2">
        <p className="mb-2 text-sm font-medium">{label}</p>
        <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
          <img
            src={URL.createObjectURL(file)}
            alt={label}
            className="h-full w-full object-cover"
          />
        </div>
        <p className="mt-1.5 truncate text-xs text-muted-foreground">{file.name}</p>
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-3 top-3 rounded-full bg-background/80 p-1.5 shadow-sm hover:bg-background"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <label
      htmlFor={`file-${label}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragActive(true)
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      className={`flex aspect-[4/3] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors ${
        dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
      }`}
    >
      <input
        id={`file-${label}`}
        type="file"
        capture="environment"
        className="sr-only"
        onChange={handleFileInput}
      />
      <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        Tap to capture or select
      </p>
    </label>
  )
}

export default function UploadPage() {
  const router = useRouter()
  const [frontImage, setFrontImage] = useState<File | null>(null)
  const [backImage, setBackImage] = useState<File | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [date, setDate] = useState('')
  const [route, setRoute] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [profit, setProfit] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [savedOffline, setSavedOffline] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const resetForm = () => {
    setFrontImage(null)
    setBackImage(null)
    setPhoneNumber('')
    setDate('')
    setRoute('')
    setTotalAmount('')
    setProfit('')
    setTags([])
    setSuccess(false)
    setSavedOffline(false)
  }

  const saveOffline = async () => {
    if (!frontImage) return

    setSubmitting(true)
    try {
      await savePendingUpload(frontImage, backImage, {
        phoneNumber,
        date,
        route,
        totalAmount,
        profit,
        tags,
      })
      setSavedOffline(true)
      setSuccess(true)
      toast.success('Saved offline. Will upload when back online.')
      window.dispatchEvent(new Event('pending-upload-added'))
    } catch {
      toast.error('Failed to save offline.')
    } finally {
      setSubmitting(false)
    }
  }

  const uploadOnline = async () => {
    if (!frontImage) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('You must be logged in.')
      return
    }

    const timestamp = Date.now()
    const sanitize = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const frontPath = `${user.id}/${timestamp}_front_${sanitize(frontImage.name)}`
    const { error: frontError } = await supabase.storage
      .from('invoice-images')
      .upload(frontPath, frontImage, { cacheControl: '3600', upsert: false })

    if (frontError) {
      throw new Error(`Front image: ${frontError.message}`)
    }

    let backPath: string | null = null
    if (backImage) {
      backPath = `${user.id}/${timestamp}_back_${sanitize(backImage.name)}`
      const { error: backError } = await supabase.storage
        .from('invoice-images')
        .upload(backPath, backImage, { cacheControl: '3600', upsert: false })

      if (backError) {
        throw new Error(`Back image: ${backError.message}`)
      }
    }

    const { error: insertError } = await supabase.from('invoices').insert({
      user_id: user.id,
      phone_number: phoneNumber || null,
      date: date || null,
      route: route || null,
      total_amount: totalAmount ? parseFloat(totalAmount) : null,
      profit: profit ? parseFloat(profit) : null,
      tags,
      front_image_path: frontPath,
      back_image_path: backPath,
    })

    if (insertError) {
      throw new Error(insertError.message)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!frontImage) {
      toast.error('Please upload the front side of the document.')
      return
    }

    setSubmitting(true)

    if (!navigator.onLine) {
      await saveOffline()
      return
    }

    try {
      await uploadOnline()
      setSuccess(true)
      toast.success('Invoice uploaded successfully!')
    } catch (err) {
      // Online upload failed -- fall back to offline save
      console.error('[upload] Online upload failed, saving offline:', err)
      toast.warning('Upload failed. Saving offline for retry.')
      await saveOffline()
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
        <div className={`rounded-full p-4 ${savedOffline ? 'bg-orange-100' : 'bg-primary/10'}`}>
          {savedOffline ? (
            <WifiOff className="h-10 w-10 text-orange-500" />
          ) : (
            <CheckCircle className="h-10 w-10 text-primary" />
          )}
        </div>
        <h2 className="mt-4 text-xl font-semibold">
          {savedOffline ? 'Saved Offline' : 'Invoice Uploaded'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {savedOffline
            ? 'Your invoice is saved locally and will upload automatically when you\u2019re back online.'
            : 'Your invoice has been saved successfully.'}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button onClick={resetForm}>
            <Plus className="mr-2 h-4 w-4" />
            Upload Another
          </Button>
          {!savedOffline && (
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              View Dashboard
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-24 sm:py-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Upload Invoice</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Capture front &amp; back images with details.
          </p>
        </div>
        <div
          className={`mt-1 flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            isOnline
              ? 'bg-green-100 text-green-700'
              : 'bg-orange-100 text-orange-700'
          }`}
        >
          {isOnline ? (
            <Wifi className="h-3 w-3" />
          ) : (
            <WifiOff className="h-3 w-3" />
          )}
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <ImageDropzone
            label="Front Side"
            file={frontImage}
            onFileSelect={setFrontImage}
            onRemove={() => setFrontImage(null)}
          />
          <ImageDropzone
            label="Back (optional)"
            file={backImage}
            onFileSelect={setBackImage}
            onRemove={() => setBackImage(null)}
          />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  inputMode="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="route">Route</Label>
              <Input
                id="route"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                placeholder="e.g. Delhi - Mumbai"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="totalAmount">Total (INR)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    ₹
                  </span>
                  <Input
                    id="totalAmount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-7"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="profit">Profit (INR)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    ₹
                  </span>
                  <Input
                    id="profit"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={profit}
                    onChange={(e) => setProfit(e.target.value)}
                    placeholder="0.00"
                    className="pl-7"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <TagInput value={tags} onChange={setTags} placeholder="Type a tag and press Enter" />
            </div>
          </CardContent>
        </Card>

        <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4 sm:static sm:border-0 sm:bg-transparent sm:p-0">
          <Button
            type="submit"
            className="w-full sm:w-auto"
            size="lg"
            disabled={submitting || !frontImage}
          >
            {submitting ? (
              <>
                <Upload className="mr-2 h-4 w-4 animate-pulse" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Submit Invoice
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
