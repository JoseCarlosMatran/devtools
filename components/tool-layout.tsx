
"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

interface ToolLayoutProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}

export function ToolLayout({ title, description, icon: Icon, children }: ToolLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" title="Volver a la página principal">
              <Button variant="ghost" size="icon" className="hover:bg-muted">
                <ArrowLeft className="w-4 h-4" />
                <span className="sr-only">Volver</span>
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-white" />
                </div>
              )}
              <h1 className="font-semibold text-lg">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="default" size="sm" className="gap-2 bg-primary hover:bg-primary/90">
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Página Principal</span>
                <span className="sm:hidden">Inicio</span>
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-7xl mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-3xl font-bold">{title}</h2>
            <p className="text-muted-foreground text-lg">{description}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
