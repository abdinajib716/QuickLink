import { LinkSkeleton } from '@/components/link-skeleton'

export default function Loading() {
  return (
    <div className="container px-4 py-8 md:px-6 space-y-8">
      <div className="w-full max-w-md h-8 bg-muted rounded animate-pulse mb-6" />
      
      <div className="w-full h-64 rounded-xl border bg-card animate-pulse mb-8" />
      
      <div className="w-full max-w-sm h-8 bg-muted rounded animate-pulse mb-6" />
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <LinkSkeleton key={i} />
        ))}
      </div>
    </div>
  )
} 