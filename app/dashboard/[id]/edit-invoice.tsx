'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { TagInput } from '@/components/ui/tag-input'
import { createClient } from '@/lib/supabase/client'
import type { Invoice } from '../actions'

export function EditInvoiceButton({ invoice }: { invoice: Invoice }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [phoneNumber, setPhoneNumber] = useState(invoice.phone_number ?? '')
  const [date, setDate] = useState(invoice.date ?? '')
  const [route, setRoute] = useState(invoice.route ?? '')
  const [totalAmount, setTotalAmount] = useState(
    invoice.total_amount !== null ? String(invoice.total_amount) : ''
  )
  const [profit, setProfit] = useState(
    invoice.profit !== null ? String(invoice.profit) : ''
  )
  const [tags, setTags] = useState<string[]>(invoice.tags ?? [])

  const resetForm = () => {
    setPhoneNumber(invoice.phone_number ?? '')
    setDate(invoice.date ?? '')
    setRoute(invoice.route ?? '')
    setTotalAmount(invoice.total_amount !== null ? String(invoice.total_amount) : '')
    setProfit(invoice.profit !== null ? String(invoice.profit) : '')
    setTags(invoice.tags ?? [])
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('invoices')
        .update({
          phone_number: phoneNumber || null,
          date: date || null,
          route: route || null,
          total_amount: totalAmount ? parseFloat(totalAmount) : null,
          profit: profit ? parseFloat(profit) : null,
          tags,
        })
        .eq('id', invoice.id)

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Invoice updated.')
      setOpen(false)
      router.refresh()
    } catch {
      toast.error('An unexpected error occurred.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (isOpen) resetForm()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="mr-1.5 h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Invoice</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input
                id="edit-phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-route">Route</Label>
            <Input
              id="edit-route"
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              placeholder="e.g. Delhi - Mumbai"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Total Amount (INR)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  ₹
                </span>
                <Input
                  id="edit-amount"
                  type="number"
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
              <Label htmlFor="edit-profit">Profit (INR)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  ₹
                </span>
                <Input
                  id="edit-profit"
                  type="number"
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
