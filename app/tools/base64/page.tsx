
"use client";

import React from 'react';
import { FileCode, ArrowUpDown, ArrowDown, ArrowUp , Search} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIAssistant } from "@/components/ai-assistant";
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { ToolLayout } from '@/components/tool-layout';
import { CopyButton } from '@/components/copy-button';
import { HistoryPanel } from '@/components/history-panel';
import { base64Utils, historyManager } from '@/lib/utils';
import type { ToolHistory } from '@/lib/types';
import { toast } from 'sonner';

export default function Base64Page() {
  const [input, setInput] = React.useState('');
  const [output, setOutput] = React.useState('');
  const [error, setError] = React.useState<string>('');
  const [mode, setMode] = React.useState<'encode' | 'decode'>('encode');
  const [history, setHistory] = React.useState<ToolHistory[]>([]);

  React.useEffect(() => {
    setHistory(historyManager.get('base64'));
  }, []);

  const processBase64 = (inputText: string, selectedMode: typeof mode) => {
    if (!inputText?.trim()) {
      setOutput('');
      setError('');
      return;
    }

    try {
      let result: string;
      
      if (selectedMode === 'encode') {
        result = base64Utils.encode(inputText);
      } else {
        result = base64Utils.decode(inputText);
      }
      
      setOutput(result);
      setError('');
      
      // Save to history
      historyManager.add('base64', {
        input: inputText,
        output: result,
        metadata: { mode: selectedMode }
      });
      setHistory(historyManager.get('base64'));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Operation failed';
      setError(errorMessage);
      setOutput('');
      toast.error(errorMessage);
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    processBase64(value, mode);
  };

  const handleModeChange = (newMode: typeof mode) => {
    setMode(newMode);
    // Switch input and output when changing modes
    if (output && !error) {
      setInput(output);
      processBase64(output, newMode);
    } else if (input) {
      processBase64(input, newMode);
    }
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
    setError('');
  };

  const handleRestore = (entry: ToolHistory) => {
    setInput(entry.input);
    const entryMode = entry.metadata?.mode || 'encode';
    setMode(entryMode);
    processBase64(entry.input, entryMode);
    toast.success('Restored from history');
  };

  const handleClearHistory = () => {
    historyManager.clear('base64');
    setHistory([]);
    toast.success('History cleared');
  };

  const handleSample = () => {
    const sample = mode === 'encode' 
      ? 'Hello, World! This is a sample text for Base64 encoding.'
      : 'SGVsbG8sIFdvcmxkISBUaGlzIGlzIGEgc2FtcGxlIHRleHQgZm9yIEJhc2U2NCBlbmNvZGluZy4=';
    setInput(sample);
    processBase64(sample, mode);
  };

  const handleSwap = () => {
    if (output && !error) {
      const newInput = output;
      const newMode = mode === 'encode' ? 'decode' : 'encode';
      setMode(newMode);
      setInput(newInput);
      processBase64(newInput, newMode);
    }
  };

  return (
    <ToolLayout
      title="Base64 Encoder/Decoder"
      description="Encode and decode Base64 strings with error handling and validation"
      icon={FileCode}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Tool */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileCode className="w-5 h-5" />
                Base64 Processor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button 
                    variant={mode === 'encode' ? 'default' : 'outline'}
                    onClick={() => handleModeChange('encode')}
                    className="gap-2 flex-1"
                  >
                    <ArrowUp className="w-4 h-4" />
                    Encode
                  </Button>
                  <Button 
                    variant={mode === 'decode' ? 'default' : 'outline'}
                    onClick={() => handleModeChange('decode')}
                    className="gap-2 flex-1"
                  >
                    <ArrowDown className="w-4 h-4" />
                    Decode
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">
                        {mode === 'encode' ? 'Text to Encode' : 'Base64 to Decode'}
                      </label>
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
                      placeholder={`Enter ${mode === 'encode' ? 'plain text' : 'Base64 encoded text'} here...`}
                      className="min-h-[150px] font-mono text-sm"
                    />
                  </div>

                  {error && (
                    <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
                      <CardContent className="pt-4">
                        <p className="text-red-600 dark:text-red-400 text-sm">
                          <strong>Error:</strong> {error}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSwap}
                      disabled={!output || !!error}
                      className="gap-2"
                    >
                      <ArrowUpDown className="w-4 h-4" />
                      Swap & Convert
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">
                        {mode === 'encode' ? 'Base64 Encoded' : 'Decoded Text'}
                      </label>
                      {output && (
                        <CopyButton text={output} label="Copy Result" />
                      )}
                    </div>
                    <Textarea
                      value={output}
                      readOnly
                      placeholder={`${mode === 'encode' ? 'Base64 encoded' : 'Decoded'} text will appear here...`}
                      className="min-h-[150px] font-mono text-sm bg-muted/30"
                    />
                  </div>

                  {output && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <Card className="bg-muted/30">
                        <CardContent className="pt-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {input.length}
                            </p>
                            <p className="text-sm text-muted-foreground">Input Characters</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-muted/30">
                        <CardContent className="pt-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {output.length}
                            </p>
                            <p className="text-sm text-muted-foreground">Output Characters</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </div>
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
