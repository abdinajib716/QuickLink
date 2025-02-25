'use client';

import { Card, CardContent, CardFooter } from '@/components/ui/card';

export function LinkSkeleton() {
  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-3/4 bg-muted rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
            <div className="h-3 w-1/4 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </CardContent>
      <CardFooter className="px-4 py-2 flex justify-end gap-2 bg-muted/40">
        <div className="h-8 w-8 rounded bg-muted animate-pulse" />
        <div className="h-8 w-8 rounded bg-muted animate-pulse" />
        <div className="h-8 w-8 rounded bg-muted animate-pulse" />
      </CardFooter>
    </Card>
  );
}
