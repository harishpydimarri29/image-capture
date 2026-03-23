'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, ChevronRight as ChevronNav } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Invoice } from './actions'

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) return '-'
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateShort(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  })
}

function MobileCard({ invoice }: { invoice: Invoice }) {
  return (
    <Link
      href={`/dashboard/${invoice.id}`}
      className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors active:bg-muted/50"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{invoice.route || 'No route'}</p>
          {invoice.date && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatDateShort(invoice.date)}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          {invoice.phone_number && <span>{invoice.phone_number}</span>}
          {invoice.total_amount !== null && (
            <span className="font-medium text-foreground">
              {formatCurrency(invoice.total_amount)}
            </span>
          )}
          {invoice.profit !== null && (
            <span className="text-primary">
              +{formatCurrency(invoice.profit)}
            </span>
          )}
        </div>
        {invoice.tags && invoice.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {invoice.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
            {invoice.tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{invoice.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
      <ChevronNav className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}

function DesktopTable({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter()

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Route</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="text-right">Total Amount</TableHead>
            <TableHead className="text-right">Profit</TableHead>
            <TableHead>Tags</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow
              key={invoice.id}
              className="cursor-pointer"
              onClick={() => router.push(`/dashboard/${invoice.id}`)}
            >
              <TableCell className="whitespace-nowrap">{formatDate(invoice.date)}</TableCell>
              <TableCell>{invoice.route || '-'}</TableCell>
              <TableCell className="whitespace-nowrap">{invoice.phone_number || '-'}</TableCell>
              <TableCell className="text-right whitespace-nowrap">
                {formatCurrency(invoice.total_amount)}
              </TableCell>
              <TableCell className="text-right whitespace-nowrap">
                {formatCurrency(invoice.profit)}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {(invoice.tags ?? []).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function InvoiceList({
  invoices,
  currentPage,
  totalPages,
  search,
}: {
  invoices: Invoice[]
  currentPage: number
  totalPages: number
  search: string
}) {
  if (invoices.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-12 text-center">
        <p className="text-muted-foreground">No invoices found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/upload">Upload your first invoice</Link>
        </Button>
      </div>
    )
  }

  const buildPageUrl = (page: number) => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    params.set('page', page.toString())
    return `/dashboard?${params.toString()}`
  }

  return (
    <div className="mt-4">
      {/* Mobile: card list */}
      <div className="flex flex-col gap-2 md:hidden">
        {invoices.map((invoice) => (
          <MobileCard key={invoice.id} invoice={invoice} />
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block">
        <DesktopTable invoices={invoices} />
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              asChild={currentPage > 1}
            >
              {currentPage > 1 ? (
                <Link href={buildPageUrl(currentPage - 1)}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </Link>
              ) : (
                <span>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              asChild={currentPage < totalPages}
            >
              {currentPage < totalPages ? (
                <Link href={buildPageUrl(currentPage + 1)}>
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              ) : (
                <span>
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="ml-1 h-4 w-4" />
                </span>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
