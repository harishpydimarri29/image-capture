import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getInvoiceById, getSignedUrl } from '../actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { DeleteInvoiceButton } from './delete-button'

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

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { invoice, error } = await getInvoiceById(id)

  if (error || !invoice) {
    notFound()
  }

  const [frontUrl, backUrl] = await Promise.all([
    getSignedUrl(invoice.front_image_path),
    invoice.back_image_path ? getSignedUrl(invoice.back_image_path) : { url: null, error: null },
  ])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <DeleteInvoiceButton invoiceId={invoice.id} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Document Images</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Front Side</p>
              {frontUrl.url ? (
                <a href={frontUrl.url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={frontUrl.url}
                    alt="Front side"
                    className="w-full rounded-md border object-contain"
                  />
                </a>
              ) : (
                <div className="flex h-48 items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
                  Image unavailable
                </div>
              )}
            </div>
            {invoice.back_image_path && (
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Back Side</p>
                {backUrl.url ? (
                  <a href={backUrl.url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={backUrl.url}
                      alt="Back side"
                      className="w-full rounded-md border object-contain"
                    />
                  </a>
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
                    Image unavailable
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <DetailRow label="Date" value={formatDate(invoice.date)} />
              <Separator />
              <DetailRow label="Route" value={invoice.route || '-'} />
              <Separator />
              <DetailRow label="Phone Number" value={invoice.phone_number || '-'} />
              <Separator />
              <DetailRow label="Total Amount" value={formatCurrency(invoice.total_amount)} />
              <Separator />
              <DetailRow label="Profit" value={formatCurrency(invoice.profit)} />
              <Separator />
              <div>
                <dt className="text-sm text-muted-foreground">Tags</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {invoice.tags && invoice.tags.length > 0 ? (
                    invoice.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm">-</span>
                  )}
                </dd>
              </div>
              <Separator />
              <DetailRow
                label="Uploaded"
                value={new Date(invoice.created_at).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              />
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  )
}
