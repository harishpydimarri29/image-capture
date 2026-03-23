'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

export function SearchBar({ defaultValue }: { defaultValue: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [value, setValue] = useState(defaultValue)

  const handleSearch = (term: string) => {
    setValue(term)
    startTransition(() => {
      const params = new URLSearchParams()
      if (term) params.set('search', term)
      params.set('page', '1')
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search by route, phone number, or tag..."
        className={`pl-9 ${isPending ? 'opacity-60' : ''}`}
      />
    </div>
  )
}
