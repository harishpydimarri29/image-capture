'use server'

import { createClient } from '@/lib/supabase/server'

export interface Invoice {
  id: string
  phone_number: string | null
  date: string | null
  route: string | null
  total_amount: number | null
  profit: number | null
  tags: string[]
  front_image_path: string
  back_image_path: string | null
  created_at: string
}

const PAGE_SIZE = 20

export async function getInvoices(search: string = '', page: number = 1) {
  const supabase = await createClient()

  let query = supabase
    .from('invoices')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (search.trim()) {
    const term = `%${search.trim()}%`
    query = query.or(`route.ilike.${term},phone_number.ilike.${term},tags.cs.{${search.trim()}}`)
  }

  const { data, error, count } = await query

  if (error) {
    return { invoices: [], total: 0, error: error.message }
  }

  return {
    invoices: (data ?? []) as Invoice[],
    total: count ?? 0,
    error: null,
  }
}

export async function getInvoiceById(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return { invoice: null, error: error.message }
  }

  return { invoice: data as Invoice, error: null }
}

export async function getSignedUrl(path: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.storage
    .from('invoice-images')
    .createSignedUrl(path, 3600)

  if (error) {
    return { url: null, error: error.message }
  }

  return { url: data.signedUrl, error: null }
}

export async function deleteInvoice(id: string) {
  const supabase = await createClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('front_image_path, back_image_path')
    .eq('id', id)
    .single()

  if (invoice) {
    const pathsToDelete = [invoice.front_image_path]
    if (invoice.back_image_path) {
      pathsToDelete.push(invoice.back_image_path)
    }
    await supabase.storage.from('invoice-images').remove(pathsToDelete)
  }

  const { error } = await supabase.from('invoices').delete().eq('id', id)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
