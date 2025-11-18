
"use client";

import React from 'react';
import { Hash, Shield , ShieldCheck, Info} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIAssistant } from "@/components/ai-assistant";
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ToolLayout } from '@/components/tool-layout';
import { CopyButton } from '@/components/copy-button';
import { HistoryPanel } from '@/components/history-panel';
import { hashUtils, historyManager } from '@/lib/utils';
import type { ToolHistory, HashResult } from '@/lib/types';
import { toast } from 'sonner';

const hashTypes = [
  { key: 'md5', name: 'MD5', description: '128-bit hash (32 chars)', color: 'text-red-600' },
  { key: 'sha1', name: 'SHA-1', description: '160-bit hash (40 chars)', color: 'text-orange-600' },
  { key: 'sha256', name: 'SHA-256', description: '256-bit hash (64 chars)', color: 'text-blue-600' },
  { key: 'sha512', name: 'SHA-512', description: '512-bit hash (128 chars)', color: 'text-green-600' },
] as const;

export default function HashGeneratorPage() {
  const [input, setInput] = React.useState('');
  const [hashes, setHashes] = React.useState<HashResult>({
    md5: '',
    sha1: '',
    sha256: '',
    sha512: ''
  });
  const [history, setHistory] = React.useState<ToolHistory[]>([]);

  React.useEffect(() => {
    setHistory(historyManager.get('hash-generator'));
  }, []);

  const generateHashes = (inputText: string) => {
    if (!inputText) {
      setHashes({ md5: '', sha1: '', sha256: '', sha512: '' });
      return;
    }

    const result = hashUtils.generate(inputText);
    setHashes(result);
    
    // Save to history
    historyManager.add('hash-generator', {
      input: inputText,
      output: JSON.stringify(result),
      metadata: { hashCount: 4 }
    });
    setHistory(historyManager.get('hash-generator'));
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    generateHashes(value);
  };

  const handleClear = () => {
    setInput('');
    setHashes({ md5: '', sha1: '', sha256: '', sha512: '' });
  };

  const handleRestore = (entry: ToolHistory) => {
    setInput(entry.input);
    generateHashes(entry.input);
    toast.success('Restored from history');
  };

  const handleClearHistory = () => {
    historyManager.clear('hash-generator');
    setHistory([]);
    toast.success('History cleared');
  };

  const handleSample = () => {
    const sample = 'The quick brown fox jumps over the lazy dog';
    setInput(sample);
    generateHashes(sample);
  };

  return (
    <ToolLayout
      title="Hash Generator"
      description="Generate MD5, SHA-1, SHA-256, SHA-512 hashes from any text input"
      icon={Hash}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Tool */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Hash Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Input Text</label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleSample}>
                      Load Sample
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleClear}>
                      Clear
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="Enter text to generate hashes..."
                  className="min-h-[120px] font-mono text-sm"
                />
              </div>

              {input && (
                <Card className="bg-muted/30">
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {input.length}
                      </p>
                      <p className="text-sm text-muted-foreground">Characters</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4">
                <h3 className="font-medium text-lg flex items-center gap-2">
                  <Hash className="w-5 h-5" />
                  Generated Hashes
                </h3>
                
                {hashTypes.map(({ key, name, description, color }) => {
                  const hashValue = hashes[key];
                  return (
                    <Card key={key} className="border-border/50">
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`${color} font-semibold`}>
                                {name}
                              </Badge>
                              <span className="text-sm text-muted-foreground">{description}</span>
                            </div>
                            {hashValue && (
                              <CopyButton text={hashValue} size="sm" />
                            )}
                          </div>
                          <div className="relative">
                            <Input
                              value={hashValue}
                              readOnly
                              placeholder={`${name} hash will appear here...`}
                              className="font-mono text-sm bg-muted/50 pr-12"
                            />
                            {hashValue && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <Badge variant="secondary" className="text-xs">
                                  {hashValue.length}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {Object.values(hashes).some(hash => hash) && (
                <Card className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20">
                  <CardContent className="pt-4">
                    <div className="text-center space-y-2">
                      <Shield className="w-8 h-8 mx-auto text-blue-600 dark:text-blue-400" />
                      <h4 className="font-semibold">Security Note</h4>
                      <p className="text-sm text-muted-foreground">
                        SHA-256 and SHA-512 are recommended for cryptographic applications. 
                        MD5 and SHA-1 are considered weak for security purposes.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>

        {/* History Panel */}
        <div className="lg:col-span-1">
          <HistoryPanel
            history={history}
            onRestore={handleRestore}
            onClear={handleClearHistory}
          />
        </div>
      </div>
    </ToolLayout>
  );
}
