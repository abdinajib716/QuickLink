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
import { Input } from '@/components/ui/input';
import { 
  Search, X, Filter, SortDesc, SortAsc, 
  AlertTriangle, RefreshCw, Loader2
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from './ui/badge';
import { format } from 'date-fns';

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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLinks, setSelectedLinks] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterUsed, setFilterUsed] = useState<'all' | 'used' | 'unused'>('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastWebSocketUpdate, setLastWebSocketUpdate] = useState<Date | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const bulkDeleteRef = useRef<() => void>(() => {});

  // Fetch initial links
  useEffect(() => {
    const fetchLinks = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/links')
        if (!response.ok) throw new Error('Failed to fetch links')
        const data = await response.json()
        console.log('Initial links loaded:', data.length)
        setLinks(data)
      } catch (error) {
        console.error('Error fetching links:', error)
        toast.error('Failed to load links')
      } finally {
        setLoading(false)
      }
    }

    fetchLinks()
  }, [refreshKey])

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

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleSelectAll = () => {
    if (selectedLinks.length === filteredLinks.length) {
      setSelectedLinks([]);
    } else {
      setSelectedLinks(filteredLinks.map((link) => link._id));
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const filteredLinks = [...links]
    .filter((link) => {
      // Filter by search term
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        link.url.toLowerCase().includes(searchLower) ||
        (link.title && link.title.toLowerCase().includes(searchLower)) ||
        (link.description && link.description.toLowerCase().includes(searchLower));

      // Filter by used status
      const matchesUsedFilter =
        filterUsed === 'all' ||
        (filterUsed === 'used' && link.used) ||
        (filterUsed === 'unused' && !link.used);

      return matchesSearch && matchesUsedFilter;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

  const allSelected = filteredLinks.length > 0 && selectedLinks.length === filteredLinks.length;
  const someSelected = selectedLinks.length > 0 && !allSelected;
  const todayDate = format(new Date(), 'EEEE, MMMM do, yyyy');
  const currentTime = format(new Date(), 'h:mm a');
  const totalLinks = links.length;
  const totalUsedLinks = links.filter(link => link.used).length;

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

  const handleDeleteSelected = async () => {
    try {
      // Show toast for bulk operation
      toast.info(`Deleting ${selectedLinks.length} links...`);
      
      // Get the IDs to delete
      const selected = selectedLinks;
      
      // Optimistically update UI
      setLinks(prev => prev.filter(link => !selectedLinks.includes(link._id)));
      
      // Clear selection
      setSelectedLinks([]);
      
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
    } catch (error) {
      console.error('Error deleting links:', error);
    }
  };

  const prepareBulkDelete = () => {
    if (selectedLinks.length === 0) return;
    
    // Store the actual delete function in the ref
    bulkDeleteRef.current = async () => {
      handleDeleteSelected();
    };
    
    // Show the confirm dialog
    setShowDeleteDialog(true);
  };

  // Update the current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      // Update refreshKey to force re-render and update displayed time
      setRefreshKey(prev => prev + 1);
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Your QuickLinks</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {todayDate} • {currentTime}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              size="sm"
              variant="outline"
              onClick={() => setRefreshKey(prev => prev + 1)}
              className="text-muted-foreground hover:text-foreground"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-1 sr-only md:not-sr-only">Refresh</span>
            </Button>
            
            <ExportCsvButton links={links} />
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search links..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1 h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={clearSearch}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Clear search</span>
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Filter className="h-4 w-4" />
                  <span>Filter</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem 
                    className={filterUsed === 'all' ? 'bg-accent' : ''}
                    onClick={() => setFilterUsed('all')}
                  >
                    All links
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className={filterUsed === 'used' ? 'bg-accent' : ''}
                    onClick={() => setFilterUsed('used')}
                  >
                    Used links
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className={filterUsed === 'unused' ? 'bg-accent' : ''}
                    onClick={() => setFilterUsed('unused')}
                  >
                    Unused links
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={toggleSortOrder}>
                    {sortOrder === 'desc' ? (
                      <>
                        <SortDesc className="h-4 w-4 mr-2" />
                        <span>Newest first</span>
                      </>
                    ) : (
                      <>
                        <SortAsc className="h-4 w-4 mr-2" />
                        <span>Oldest first</span>
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {selectedLinks.length > 0 && (
              <ConfirmDialog 
                title="Delete selected links?"
                description={`Are you sure you want to delete ${selectedLinks.length} selected link${selectedLinks.length === 1 ? '' : 's'}? This action cannot be undone.`}
                onConfirm={handleDeleteSelected}
              >
                <Button 
                  variant="destructive" 
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete {selectedLinks.length}</span>
                </Button>
              </ConfirmDialog>
            )}
            
            {filteredLinks.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="flex items-center gap-1"
              >
                <CheckSquare className={`h-4 w-4 ${allSelected ? 'text-primary' : ''}`} />
                <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <div className="flex gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{totalLinks} total link{totalLinks !== 1 ? 's' : ''}</Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">{totalUsedLinks} used</Badge>
            {filterUsed !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <span>Filtered: {filterUsed === 'used' ? 'Used only' : 'Unused only'}</span>
                <X 
                  className="h-3 w-3 cursor-pointer ml-1" 
                  onClick={() => setFilterUsed('all')}
                />
              </Badge>
            )}
            {searchTerm && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <span>Search: {searchTerm}</span>
                <X 
                  className="h-3 w-3 cursor-pointer ml-1" 
                  onClick={clearSearch}
                />
              </Badge>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredLinks.length > 0 ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredLinks.map((link) => (
            <LinkCard
              key={link._id}
              link={link}
              onDelete={handleDelete}
              selected={selectedLinks.includes(link._id)}
              onSelect={() => {
                setSelectedLinks(prev => 
                  prev.includes(link._id)
                    ? prev.filter(id => id !== link._id) // Remove if already selected
                    : [...prev, link._id] // Add if not selected
                );
              }}
            />
          ))}
        </div>
      ) : links.length > 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium">No matching links found</h3>
          <p className="text-muted-foreground mt-1">
            Try adjusting your search or filter criteria
          </p>
          <Button 
            variant="link" 
            className="mt-2" 
            onClick={() => {
              setSearchTerm('');
              setFilterUsed('all');
            }}
          >
            Clear all filters
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium">No links yet</h3>
          <p className="text-muted-foreground mt-1 max-w-md">
            Add your first link using the form below to get started.
          </p>
        </div>
      )}
      
      {/* Custom confirm dialog for bulk delete */}
      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete Multiple Links"
        description={`Are you sure you want to delete ${selectedLinks.length} links? This action cannot be undone.`}
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