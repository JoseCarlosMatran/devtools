
"use client";

import React from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { clipboard } from '@/lib/utils';
import { toast } from 'sonner';

interface CopyButtonProps {
  text: string;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  label?: string;
}

export function CopyButton({ 
  text, 
  className = "", 
  size = "sm", 
  variant = "outline",
  label = "Copy"
}: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    const success = await clipboard.copy(text);
    if (success) {
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={`gap-2 transition-colors ${className}`}
      disabled={!text || copied}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          {size !== "icon" && "Copied"}
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          {size !== "icon" && label}
        </>
      )}
    </Button>
  );
}
