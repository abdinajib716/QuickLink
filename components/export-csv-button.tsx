'use client';

import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';

interface LinkData {
  _id: string;
  url: string;
  description?: string;
  title?: string;
  used?: boolean;
  createdAt: string;
}

interface ExportCsvButtonProps {
  links: LinkData[];
  className?: string;
}

export function ExportCsvButton({ links, className = '' }: ExportCsvButtonProps) {
  const generateCsv = () => {
    if (links.length === 0) {
      toast.error('No links to export');
      return;
    }
    
    // Log links to debug
    console.log('Links for export:', links);
    console.log('Links with used status:', links.filter(link => link.used));
    
    // Create CSV headers
    const headers = ['ID', 'URL', 'Description', 'Title', 'Status', 'Created At', 'Time'];
    
    // Create CSV rows
    const rows = links.map((link, index) => {
      const linkId = `LIN${String(index + 1).padStart(2, '0')}`;
      
      // Force boolean conversion and log the exact value for debugging
      console.log(`Link ${link._id} raw used value:`, link.used);
      
      // Make sure any truthy value is considered as used
      // The used value might be missing or undefined in some documents
      const isUsed = link.used === true;
      const status = isUsed ? 'Used' : 'Unused';
      
      const description = link.description || '';
      const title = link.title || '';
      
      // Split date and time for better formatting
      const date = new Date(link.createdAt);
      const createdDate = date.toLocaleDateString();
      
      // Format time as HH:MM:SS
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      const createdTime = `${hours}:${minutes}:${seconds}`;
      
      // Log individual link status for debugging
      console.log(`Link ${linkId} status:`, { url: link.url, used: link.used, isUsed, status });
      
      return [
        linkId,
        link.url,
        description.replace(/,/g, ' '), // Remove commas to avoid CSV issues
        title.replace(/,/g, ' '),
        status,
        createdDate,
        createdTime
      ];
    });
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create a Blob with the CSV content
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create a download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `quicklink_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    // Add to document, trigger click, and clean up
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('CSV file exported successfully');
  };
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={generateCsv}
      className={`flex items-center gap-1 ${className}`}
    >
      <FileDown className="h-4 w-4" />
      Export CSV
    </Button>
  );
}
