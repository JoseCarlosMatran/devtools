
"use client";

import React from 'react';
import { Clock, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatTime } from '@/lib/utils';
import type { ToolHistory } from '@/lib/types';

interface HistoryPanelProps {
  history: ToolHistory[];
  onRestore: (entry: ToolHistory) => void;
  onClear: () => void;
  className?: string;
}

export function HistoryPanel({ history, onRestore, onClear, className = "" }: HistoryPanelProps) {
  if (!history?.length) {
    return (
      <Card className={`${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No recent history available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent History
            <Badge variant="secondary" className="ml-2">
              {history.length}
            </Badge>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onClear}
            className="text-destructive hover:text-destructive gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {history.map((entry) => (
          <div
            key={entry.id}
            className="group p-3 rounded-lg border border-border/50 hover:border-border transition-all hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {formatTime(entry.timestamp)}
                  </Badge>
                </div>
                <p className="text-sm font-mono bg-muted/50 rounded px-2 py-1 truncate">
                  {entry.input.length > 100 ? `${entry.input.substring(0, 100)}...` : entry.input}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRestore(entry)}
                className="opacity-0 group-hover:opacity-100 transition-opacity gap-2 shrink-0"
              >
                <Copy className="w-3 h-3" />
                Restore
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
