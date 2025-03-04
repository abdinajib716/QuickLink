'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface LinkFormProps {
  onSuccess?: () => void
}

export function LinkForm({ onSuccess }: LinkFormProps) {
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Extract URL from mixed content
  const extractUrl = (text: string): string | null => {
    const urlRegex = /(https?:\/\/[^\s,，。；;]+)/g;
    const matches = text.match(urlRegex);
    return matches && matches.length > 0 ? matches[0] : null;
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setUrl(inputValue);
    
    // Clear any previous errors when input changes
    if (error) setError(null);
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // Try to extract URL if one isn't clearly identified
    let validUrl = url;
    const extractedUrl = extractUrl(url);
    
    if (extractedUrl) {
      validUrl = extractedUrl;
      // If we extracted a URL that's different from the input,
      // use the original input as description if no description was provided
      if (validUrl !== url && !description) {
        setDescription(url);
      }
    } else {
      // Only show this error if no URL could be extracted
      toast.error('No valid URL found in the input');
      return;
    }
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: validUrl,
          description,
        }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save link')
      }
      
      // Reset form
      setUrl('')
      setDescription('')
      formRef.current?.reset()
      toast.success('Link saved successfully!')
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Save a new link</CardTitle>
      </CardHeader>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="url">URL</Label>
          <Input
            id="url"
            type="text"
            placeholder="Enter or paste a URL or content containing a URL"
            value={url}
            onChange={handleUrlChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            placeholder="Add a description for this link"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        {error && (
          <div className="text-red-500 text-sm">
            {error}
          </div>
        )}
        <CardFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Link'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
} 