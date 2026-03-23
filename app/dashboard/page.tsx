import { Suspense } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getInvoices } from './actions'
import { InvoiceList } from './invoice-list'
import { SearchBar } from './search-bar'
import { Button } from '@/components/ui/button'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>
}) {
  const { search = '', page = '1' } = await searchParams
  const currentPage = Math.max(1, parseInt(page, 10) || 1)
  const { invoices, total, error } = await getInvoices(search, currentPage)
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {total} invoice{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Button size="sm" asChild className="shrink-0">
          <Link href="/upload">
            <Plus className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">New Invoice</span>
            <span className="sm:hidden">New</span>
          </Link>
        </Button>
      </div>

      <div className="mt-4">
        <SearchBar defaultValue={search} />
      </div>

      {error ? (
        <div className="mt-4 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <Suspense fallback={<div className="mt-6 text-muted-foreground">Loading...</div>}>
          <InvoiceList
            invoices={invoices}
            currentPage={currentPage}
            totalPages={totalPages}
            search={search}
          />
        </Suspense>
      )}
    </div>
  )
}
