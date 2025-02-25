'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/navbar'
import { LinkForm } from '@/components/link-form'
import { LinkList } from '@/components/link-list'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        <div className="container px-4 py-8 md:px-6 space-y-8">
          <div className="max-w-xl mx-auto md:mx-0">
            <LinkForm />
          </div>
          
          <LinkList />
        </div>
      </main>
      
      <footer className="border-t py-6">
        <div className="container px-4 md:px-6">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} QuickLink. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
