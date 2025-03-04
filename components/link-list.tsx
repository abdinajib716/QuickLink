'use client'

import { useState, useEffect, useRef } from 'react'
import { LinkCard } from '@/components/link-card'
import { LinkSkeleton } from '@/components/link-skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchBar } from '@/components/search-bar'
import { webSocketService } from '@/lib/websocket'
import { toast } from 'sonner'
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2, CheckSquare } from "lucide-react";
import { ConfirmDialog } from './confirm-dialog';
import { ExportCsvButton } from './export-csv-button';

interface LinkData {
  _id: string
  url: string
  description?: string
  title?: string
  favicon?: string
  used?: boolean
  createdAt: string
}

export function LinkList() {
  const [links, setLinks] = useState<LinkData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [lastWebSocketUpdate, setLastWebSocketUpdate] = useState<Date | null>(null)
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const bulkDeleteRef = useRef<() => void>(() => {});

  // Fetch initial links
  useEffect(() => {
    const fetchLinks = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/links')
        if (!response.ok) throw new Error('Failed to fetch links')
        const data = await response.json()
        console.log('Initial links loaded:', data.length)
        setLinks(data)
      } catch (error) {
        console.error('Error fetching links:', error)
        toast.error('Failed to load links')
      } finally {
        setIsLoading(false)
      }
    }

    fetchLinks()
  }, [])

  // Setup WebSocket subscription with better debugging
  useEffect(() => {
    console.log('Setting up WebSocket subscription in LinkList')
    
    const handleWebSocketEvent = (event: any) => {
      console.log('💬 LinkList received WebSocket event:', event)
      setLastWebSocketUpdate(new Date())
      
      try {
        // Handle parsed event
        let parsedEvent = typeof event === 'string' ? JSON.parse(event) : event
        
        console.log(`Processing ${parsedEvent.type} event`)
        
        // Handle different event types
        if (parsedEvent.type === 'initial_state') {
          // Handle initial state load
          console.log('Setting initial state from WebSocket')
          setLinks(parsedEvent.payload)
        }
        else if (parsedEvent.type === 'link_added') {
          // Handle new link
          const newLink = parsedEvent.payload
          console.log('Adding new link to UI:', newLink)
          
          setLinks(prevLinks => {
            // Check if this link already exists (by _id)
            const linkExists = prevLinks.some(link => link._id === newLink._id)
            
            if (linkExists) {
              // Update the existing link
              return prevLinks.map(link => 
                link._id === newLink._id ? newLink : link
              )
            } else {
              // Add the new link at the beginning
              toast.success('New link added!')
              return [newLink, ...prevLinks]
            }
          })
        }
        else if (parsedEvent.type === 'link_updated') {
          // Handle link update (e.g., usage status change)
          const updatedLink = parsedEvent.payload;
          console.log('Received link update:', updatedLink);
          
          setLinks(prevLinks => {
            // Using map to create a new array with the updated link
            const newLinks = prevLinks.map(link => 
              link._id === updatedLink._id ? { ...link, ...updatedLink } : link
            );
            console.log('Updated links state after update:', newLinks);
            return newLinks;
          });
        }
        else if (parsedEvent.type === 'link_deleted') {
          const deletedId = parsedEvent.payload.id;
          
          // Use functional update to avoid unnecessary renders
          setLinks(prevLinks => {
            // Find the link first to check if it exists
            const linkIndex = prevLinks.findIndex(link => link._id === deletedId);
            
            if (linkIndex >= 0) {
              // If found, create a new array without the deleted link
              toast.success(`Deleted: ${parsedEvent.payload.title || 'Link'}`);
              
              // Create a new array without the deleted item
              const newLinks = [...prevLinks];
              newLinks.splice(linkIndex, 1);
              return newLinks;
            }
            return prevLinks;
          });
        }
      } catch (error) {
        console.error('Error processing WebSocket event:', error)
      }
    }
    
    // Subscribe to WebSocket events
    const subscription = webSocketService.subscribe(handleWebSocketEvent)
    
    return () => {
      console.log('Cleaning up WebSocket subscription')
      subscription.unsubscribe()
    }
  }, [])

  const handleDelete = async (id: string) => {
    try {
      // Get the link title for the toast message
      const linkToDelete = links.find(link => link._id === id);
      const linkTitle = linkToDelete?.title || 'Link';
      
      // Optimistically update UI first for responsiveness
      setLinks(prevLinks => prevLinks.filter(link => link._id !== id));
      toast.success(`Deleting: ${linkTitle}...`);
      
      // Then send the delete request
      const response = await fetch(`/api/links/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        // If deletion fails, restore the link
        toast.error('Failed to delete link');
        setLinks(prev => [...prev, linkToDelete!]);
        throw new Error('Failed to delete link');
      }
      
      // Success confirmation (WebSocket will handle the permanent UI update)
      console.log(`Link ${id} successfully deleted`);
    } catch (error) {
      console.error('Error deleting link:', error);
    }
  }

  // Check if a link has been refreshed from the API to ensure we have the latest data
  useEffect(() => {
    console.log('Current links data:', links);
    
    // Check for any links that should be marked as used
    const hasUsedLinks = links.some(link => link.used);
    console.log('Has used links:', hasUsedLinks);
    
  }, [links]);

  // Filter and sort links
  const filteredLinks = links.filter((link) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      link.url.toLowerCase().includes(searchLower) ||
      (link.description?.toLowerCase() || '').includes(searchLower) ||
      (link.title?.toLowerCase() || '').includes(searchLower)
    )
  }).sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime()
    const dateB = new Date(b.createdAt).getTime()
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
  })

  // Update the current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Format the current time
  const timeString = currentTime.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit'
  });
  const dateString = currentTime.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  // Toggle selection of a link
  const toggleLinkSelection = (id: string) => {
    setSelectedLinks(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  };
  
  // Select/deselect all links
  const toggleSelectAll = () => {
    if (selectedLinks.size === filteredLinks.length) {
      // If all are selected, deselect all
      setSelectedLinks(new Set());
    } else {
      // Otherwise select all filtered links
      const allIds = new Set(filteredLinks.map(link => link._id));
      setSelectedLinks(allIds);
    }
  };
  
  // Prepare bulk delete without executing it
  const prepareBulkDelete = () => {
    if (selectedLinks.size === 0) return;
    
    // Store the actual delete function in the ref
    bulkDeleteRef.current = async () => {
      // Show toast for bulk operation
      toast.info(`Deleting ${selectedLinks.size} links...`);
      
      // Get the IDs to delete
      const selected = Array.from(selectedLinks);
      
      // Optimistically update UI
      setLinks(prev => prev.filter(link => !selectedLinks.has(link._id)));
      
      // Clear selection
      setSelectedLinks(new Set());
      
      try {
        // Use the batch delete endpoint if available
        const response = await fetch('/api/links/batch', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ids: selected }),
        });
        
        if (!response.ok) {
          throw new Error('Batch delete failed');
        }
        
        const result = await response.json();
        toast.success(`Successfully deleted ${result.deletedCount} links`);
      } catch (error) {
        console.error('Error during bulk delete:', error);
        
        // Fall back to individual deletes if batch fails
        try {
          const results = await Promise.allSettled(
            selected.map(id => 
              fetch(`/api/links/${id}`, { method: 'DELETE' })
            )
          );
          
          const successes = results.filter(r => r.status === 'fulfilled').length;
          const failures = results.length - successes;
          
          if (failures > 0) {
            toast.error(`Failed to delete ${failures} links`);
          }
          
          if (successes > 0) {
            toast.success(`Successfully deleted ${successes} links`);
          }
        } catch (e) {
          toast.error('Error during bulk delete operation');
        }
      }
    };
    
    // Show the confirm dialog
    setShowDeleteDialog(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold tracking-tight">Your Links</h1>
          <span className="ml-4 text-sm text-muted-foreground">
            {timeString} · {dateString}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {filteredLinks.length > 0 && (
            <>
              <ExportCsvButton links={filteredLinks} />
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                className="flex items-center gap-1"
              >
                <CheckSquare className="h-4 w-4" />
                {selectedLinks.size === filteredLinks.length ? "Deselect All" : "Select All"}
              </Button>
            </>
          )}
          
          {selectedLinks.size > 0 && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={prepareBulkDelete}
              className="flex items-center gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected ({selectedLinks.size})
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        {/* Search bar */}
        <SearchBar 
          value={searchTerm}
          onChange={(value) => setSearchTerm(value)}
          placeholder="Search links..."
          className="w-full sm:max-w-md"
        />
        
        {/* Sort order filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Sort by:</span>
          <Select 
            value={sortOrder} 
            onValueChange={(value) => setSortOrder(value as 'newest' | 'oldest')}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Sort order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-muted rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : filteredLinks.length > 0 ? (
          <>
            {filteredLinks.map(link => (
              <div key={link._id} className="relative group">
                <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Checkbox
                    checked={selectedLinks.has(link._id)}
                    onCheckedChange={() => toggleLinkSelection(link._id)}
                  />
                </div>
                <LinkCard
                  link={link}
                  onDelete={handleDelete}
                  selected={selectedLinks.has(link._id)}
                />
              </div>
            ))}
          </>
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-xl text-muted-foreground">
              {searchTerm ? 'No links match your search' : 'No links saved yet'}
            </p>
          </div>
        )}
      </div>
      
      {/* Custom confirm dialog for bulk delete */}
      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete Multiple Links"
        description={`Are you sure you want to delete ${selectedLinks.size} links? This action cannot be undone.`}
        confirmText="Delete All"
        cancelText="Cancel"
        onConfirm={() => {
          bulkDeleteRef.current();
          setShowDeleteDialog(false);
        }}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  )
} 