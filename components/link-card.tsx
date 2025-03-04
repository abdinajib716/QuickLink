'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Copy, ExternalLink, Trash2, Globe, CheckCircle2, Clock, Clipboard, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from './confirm-dialog';
import { formatDistanceToNow, format } from 'date-fns';
import Image from 'next/image';
import LinkIcon from './link-icon';

interface LinkCardProps {
  link: {
    _id: string;
    url: string;
    description?: string;
    createdAt: string;
    title?: string;
    favicon?: string;
    used?: boolean;
  };
  onDelete: (id: string) => void;
  selected?: boolean;
  onSelect?: () => void;
}

export function LinkCard({ link, onDelete, selected = false, onSelect }: LinkCardProps) {
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Initialize isUsed from the link.used property to ensure consistency
  const [isUsed, setIsUsed] = useState(Boolean(link.used));
  const hostname = new URL(link.url).hostname;

  const markAsUsed = async () => {
    if (isUsed) return; // If already marked as used, don't need to update
    
    try {
      console.log(`Marking link ${link._id} as used`);
      const response = await fetch(`/api/links/${link._id}/used`, {
        method: 'PATCH',
      });
      
      if (response.ok) {
        console.log(`Successfully marked link ${link._id} as used`);
        const updatedLink = await response.json();
        console.log('Updated link data:', updatedLink);
        setIsUsed(true);
      }
    } catch (error) {
      console.error('Failed to mark link as used:', error);
      // Continue anyway, not critical
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
      
      // Mark as used when copied
      markAsUsed();
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleOpenLink = () => {
    window.open(link.url, '_blank');
    // Mark as used when opened
    markAsUsed();
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
    <Card 
      className={`group relative overflow-hidden transition-all hover:shadow-lg ${selected ? 'ring-2 ring-primary' : ''} ${
        isUsed || link.used 
          ? 'border-l-4 border-l-green-500 bg-green-50/30 dark:bg-green-950/10' 
          : 'hover:border-l-4 hover:border-l-gray-200 dark:hover:border-l-gray-700'
      }`}
      onClick={() => onSelect && onSelect()}
    >
      <CardContent className="space-y-3 p-6 pb-16">
        <div className="flex items-start gap-3">
          {link.favicon ? (
            <div className="w-6 h-6 relative">
              <div className="absolute inset-0 bg-gray-100 rounded-sm flex items-center justify-center">
                <LinkIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              {/* Render the favicon with error handling */}
              <img
                src={link.favicon}
                alt=""
                width={24}
                height={24}
                className="rounded-sm relative z-10 w-full h-full object-contain"
                onError={(e) => {
                  // Hide broken image and show fallback
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <LinkIcon className="h-6 w-6 text-muted-foreground mt-0.5" />
          )}
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg leading-tight text-foreground line-clamp-1">
                {link.title || hostname}
              </h3>
              {selected && (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              )}
            </div>
            <p className="text-sm text-foreground/80 line-clamp-2">
              {link.description || hostname}
            </p>
            <a 
              href={link.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-xs text-muted-foreground hover:text-foreground transition-colors line-clamp-1"
            >
              {link.url}
            </a>
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-2 mt-1 relative z-10">
          <span className="flex items-center text-sm font-medium text-foreground">
            <Clock className="w-3 h-3 mr-1 text-muted-foreground" />
            Added {formatDistanceToNow(new Date(link.createdAt))} ago
            {(isUsed || link.used) && (
              <span className="ml-2 inline-flex items-center text-green-600 text-xs font-medium">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Used
              </span>
            )}
          </span>
          <span className="text-sm font-mono bg-muted px-2 py-1 rounded text-foreground font-medium tabular-nums">
            {formattedDate}
          </span>
        </div>
      </CardContent>

      <div className="absolute right-2 bottom-2 flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background hover:shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            copyToClipboard();
          }}
          title="Copy link"
        >
          {copied ? <ClipboardCheck className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background hover:shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenLink();
          }}
          title="Open link"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
        <ConfirmDialog onConfirm={handleDelete}>
          <Button
            size="icon"
            variant="ghost" 
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => e.stopPropagation()}
            title="Delete link"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </ConfirmDialog>
      </div>
    </Card>
  );
}
