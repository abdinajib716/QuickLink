'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ReactNode, useState } from "react";

interface ConfirmDialogProps {
  children?: ReactNode;
  onConfirm: () => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  open?: boolean;
}

export function ConfirmDialog({ 
  children, 
  onConfirm, 
  onCancel,
  title = "Are you sure?", 
  description = "This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  open
}: ConfirmDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Determine if we're in controlled or uncontrolled mode
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  
  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    
    if (!newOpen && onCancel) {
      onCancel();
    }
  };
  
  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      {children && (
        <AlertDialogTrigger asChild>
          {children}
        </AlertDialogTrigger>
      )}
      <AlertDialogContent className="max-w-md border-destructive/20">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => {
              onConfirm();
              if (!isControlled) {
                setInternalOpen(false);
              }
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
