'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Copy, ExternalLink, Trash2, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from './confirm-dialog';
import { formatDistanceToNow, format } from 'date-fns';

interface LinkCardProps {
  link: {
    _id: string;
    url: string;
    description?: string;
    createdAt: string;
    title?: string;
    favicon?: string;
  };
  onDelete: (id: string) => void;
  selected?: boolean;
}

export function LinkCard({ link, onDelete, selected = false }: LinkCardProps) {
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const hostname = new URL(link.url).hostname;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleDelete = (e?: React.MouseEvent) => {
    // Prevent bubbling if event is provided 
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Show deleting state immediately
    setIsDeleting(true);
    
    // Call the parent's delete handler
    onDelete(link._id);
    
    // If no WebSocket confirmation after 3 seconds, reset UI
    const timeout = setTimeout(() => {
      setIsDeleting(false);
    }, 3000);
    
    return () => clearTimeout(timeout);
  };

  // Show deleting state
  if (isDeleting) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 opacity-50">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  const formattedDate = format(new Date(link.createdAt), 'MMM d, yyyy • h:mm a');

  return (
    <Card className={`group relative overflow-hidden transition-all hover:shadow-lg dark:hover:shadow-primary/10 ${selected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="space-y-3 p-6">
        <div className="flex items-start gap-3">
          {link.favicon ? (
            <img 
              src={link.favicon} 
              alt="Site favicon" 
              className="h-6 w-6 rounded-sm"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-primary/10">
              <Globe className="h-4 w-4 text-primary" />
            </div>
          )}
          <div className="flex-1 space-y-1 overflow-hidden">
            <h3 className="font-medium leading-none">
              {link.title || hostname}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {hostname}
            </p>
          </div>
        </div>

        {link.description && (
          <p className="text-sm text-foreground/90 line-clamp-2 leading-relaxed">
            {link.description}
          </p>
        )}

        <div className="flex items-center justify-between border-t pt-2 mt-1">
          <span className="text-xs font-medium text-muted-foreground">
            Added {formatDistanceToNow(new Date(link.createdAt))} ago
          </span>
          <span className="text-xs font-mono bg-muted px-2 py-1 rounded text-foreground tabular-nums">
            {formattedDate}
          </span>
        </div>
      </CardContent>

      <CardFooter className="absolute bottom-0 left-0 right-0 flex justify-end gap-2 border-t bg-background p-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={copyToClipboard}
        >
          <Copy className="h-4 w-4" />
          <span className="sr-only">Copy link</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => window.open(link.url, '_blank')}
        >
          <ExternalLink className="h-4 w-4" />
          <span className="sr-only">Open link</span>
        </Button>
        <ConfirmDialog onConfirm={handleDelete}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive opacity-0 transition-opacity hover:text-destructive/90 group-hover:opacity-100"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete link</span>
          </Button>
        </ConfirmDialog>
      </CardFooter>
    </Card>
  );
}
