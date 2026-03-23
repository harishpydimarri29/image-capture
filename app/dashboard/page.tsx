import { Suspense } from 'react'
import { getInvoices } from './actions'
import { InvoiceTable } from './invoice-table'
import { SearchBar } from './search-bar'

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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} invoice{total !== 1 ? 's' : ''} found
          </p>
        </div>
      </div>

      <div className="mt-6">
        <SearchBar defaultValue={search} />
      </div>

      {error ? (
        <div className="mt-6 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <Suspense fallback={<div className="mt-6 text-muted-foreground">Loading...</div>}>
          <InvoiceTable
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
