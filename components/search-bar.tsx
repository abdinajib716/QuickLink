'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchBar({ 
  value, 
  onChange, 
  placeholder = 'Search...', 
  className = ''
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value)
  
  // Keep local value in sync with parent value
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Handle clearing the search
  const handleClear = () => {
    setLocalValue('')
    onChange('')
  }
  
  // Handle search input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    onChange(newValue)
  }

  return (
    <div className={`relative w-full ${className}`}>
      {/* Better positioned icon with proper spacing */}
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
      
      <Input
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        className="w-full pl-10 pr-10 py-2 h-11 border-gray-300 text-gray-800 placeholder:text-gray-500 
                  focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-primary"
      />
      
      {localValue && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0 rounded-full 
                    hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 
                    focus:ring-primary"
          onClick={handleClear}
          type="button"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
} 