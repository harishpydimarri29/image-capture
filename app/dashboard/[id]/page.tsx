import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getInvoiceById, getSignedUrl } from '../actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { DeleteInvoiceButton } from './delete-button'
import { EditInvoiceButton } from './edit-invoice'
import { UploadBackImage } from './upload-back'

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
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <EditInvoiceButton invoice={invoice} />
          <DeleteInvoiceButton invoiceId={invoice.id} />
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Document Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Front</p>
                {frontUrl.url ? (
                  <a href={frontUrl.url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={frontUrl.url}
                      alt="Front side"
                      className="aspect-[3/4] w-full rounded-md border object-cover"
                    />
                  </a>
                ) : (
                  <div className="flex aspect-[3/4] items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                    Unavailable
                  </div>
                )}
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Back</p>
                {invoice.back_image_path && backUrl.url ? (
                  <a href={backUrl.url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={backUrl.url}
                      alt="Back side"
                      className="aspect-[3/4] w-full rounded-md border object-cover"
                    />
                  </a>
                ) : invoice.back_image_path ? (
                  <div className="flex aspect-[3/4] items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                    Unavailable
                  </div>
                ) : (
                  <UploadBackImage invoiceId={invoice.id} />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <DetailRow label="Date" value={formatDate(invoice.date)} />
                <DetailRow label="Phone" value={invoice.phone_number || '-'} />
              </div>
              <Separator />
              <DetailRow label="Route" value={invoice.route || '-'} />
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <DetailRow label="Total Amount" value={formatCurrency(invoice.total_amount)} />
                <DetailRow label="Profit" value={formatCurrency(invoice.profit)} />
              </div>
              <Separator />
              <div>
                <dt className="text-xs text-muted-foreground">Tags</dt>
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
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  )
}
