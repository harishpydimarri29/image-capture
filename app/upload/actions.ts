'use server'

import { createClient } from '@/lib/supabase/server'

interface CreateInvoiceInput {
  phoneNumber: string
  date: string
  route: string
  totalAmount: string
  profit: string
  tags: string[]
  frontImagePath: string
  backImagePath: string | null
}

export async function createInvoice(input: CreateInvoiceInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase.from('invoices').insert({
    user_id: user.id,
    phone_number: input.phoneNumber || null,
    date: input.date || null,
    route: input.route || null,
    total_amount: input.totalAmount ? parseFloat(input.totalAmount) : null,
    profit: input.profit ? parseFloat(input.profit) : null,
    tags: input.tags,
    front_image_path: input.frontImagePath,
    back_image_path: input.backImagePath,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
