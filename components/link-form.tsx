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
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!url) {
      toast.error('Please enter a URL')
      return
    }
    
    // Basic URL validation
    try {
      new URL(url)
    } catch (error) {
      toast.error('Please enter a valid URL')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, description }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to save link')
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
    } catch (error) {
      console.error('Error saving link:', error)
      toast.error('Failed to save link')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Save a new link</CardTitle>
      </CardHeader>
      <form ref={formRef} onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
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
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Link'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
} 