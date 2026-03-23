'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, X, ImageIcon, CheckCircle, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TagInput } from '@/components/ui/tag-input'
import { createClient } from '@/lib/supabase/client'

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
      if (selected) {
        onFileSelect(selected)
      }
    },
    [onFileSelect]
  )

  if (file) {
    return (
      <div className="relative rounded-lg border bg-muted/30 p-2">
        <p className="mb-2 text-sm font-medium">{label}</p>
        <div className="relative aspect-[3/2] overflow-hidden rounded-md">
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
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragActive(true)
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      className={`flex aspect-[3/2] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors ${
        dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
      }`}
      onClick={() => document.getElementById(`file-${label}`)?.click()}
    >
      <input
        id={`file-${label}`}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileInput}
      />
      <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        Tap to capture or select
      </p>
    </div>
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
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!frontImage) {
      toast.error('Please upload the front side of the document.')
      return
    }

    setSubmitting(true)

    try {
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
        toast.error(`Failed to upload front image: ${frontError.message}`)
        return
      }

      let backPath: string | null = null
      if (backImage) {
        backPath = `${user.id}/${timestamp}_back_${sanitize(backImage.name)}`
        const { error: backError } = await supabase.storage
          .from('invoice-images')
          .upload(backPath, backImage, { cacheControl: '3600', upsert: false })

        if (backError) {
          toast.error(`Failed to upload back image: ${backError.message}`)
          return
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
        toast.error(insertError.message)
        return
      }

      setSuccess(true)
      toast.success('Invoice uploaded successfully!')
    } catch {
      toast.error('An unexpected error occurred.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
        <div className="rounded-full bg-primary/10 p-4">
          <CheckCircle className="h-10 w-10 text-primary" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">Invoice Uploaded</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your invoice has been saved successfully.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button onClick={resetForm}>
            <Plus className="mr-2 h-4 w-4" />
            Upload Another
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            View Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-24 sm:py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold sm:text-2xl">Upload Invoice</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Capture front &amp; back images with details.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Document Images</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

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
