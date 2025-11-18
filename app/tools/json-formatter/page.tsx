
"use client";

import React from 'react';
import { Code2, CheckCircle, XCircle, Minimize, Maximize, Wand2, MessageSquare, Sparkles, FileCode, Shield, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

import { ToolLayout } from '@/components/tool-layout';
import { CopyButton } from '@/components/copy-button';
import { HistoryPanel } from '@/components/history-panel';
import { jsonUtils, historyManager } from '@/lib/utils';
import type { ToolHistory } from '@/lib/types';
import { toast } from 'sonner';

export default function JsonFormatterPage() {
  const [input, setInput] = React.useState('');
  const [output, setOutput] = React.useState('');
  const [isValid, setIsValid] = React.useState(true);
  const [error, setError] = React.useState<string>('');
  const [mode, setMode] = React.useState<'format' | 'minify' | 'validate'>('format');
  const [history, setHistory] = React.useState<ToolHistory[]>([]);
  const [activeTab, setActiveTab] = React.useState('formatter');
  
  // AI Features
  const [aiLoading, setAiLoading] = React.useState(false);
  const [errorExplanation, setErrorExplanation] = React.useState('');
  const [description, setDescription] = React.useState('');
  
  // Code Generation
  const [typescript, setTypescript] = React.useState('');
  const [zodSchema, setZodSchema] = React.useState('');
  const [openApiSpec, setOpenApiSpec] = React.useState('');

  React.useEffect(() => {
    setHistory(historyManager.get('json-formatter'));
  }, []);

  const processJson = (inputText: string, selectedMode: typeof mode) => {
    if (!inputText?.trim()) {
      setOutput('');
      setError('');
      setIsValid(true);
      setErrorExplanation('');
      return;
    }

    let result;
    
    switch (selectedMode) {
      case 'format':
        result = jsonUtils.format(inputText, 2);
        break;
      case 'minify':
        result = jsonUtils.minify(inputText);
        break;
      case 'validate':
        result = jsonUtils.validate(inputText);
        break;
    }

    if (selectedMode === 'validate') {
      setOutput(result.isValid ? '✓ Valid JSON' : '✗ Invalid JSON');
    } else {
      setOutput((result as any).formatted || (result as any).minified || '');
    }
    
    setIsValid(result.isValid);
    setError(result.error || '');

    // Auto-explain error with AI
    if (!result.isValid && result.error) {
      explainError(result.error, inputText);
    } else {
      setErrorExplanation('');
    }

    // Save to history if valid and not validation mode
    if (result.isValid && selectedMode !== 'validate') {
      historyManager.add('json-formatter', {
        input: inputText,
        output: selectedMode === 'format' ? (result as any).formatted : (result as any).minified,
        metadata: { mode: selectedMode }
      });
      setHistory(historyManager.get('json-formatter'));
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    processJson(value, mode);
  };

  const handleModeChange = (newMode: typeof mode) => {
    setMode(newMode);
    processJson(input, newMode);
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
    setError('');
    setIsValid(true);
    setErrorExplanation('');
    setTypescript('');
    setZodSchema('');
    setOpenApiSpec('');
  };

  const handleRestore = (entry: ToolHistory) => {
    setInput(entry.input);
    const entryMode = entry.metadata?.mode || 'format';
    setMode(entryMode);
    processJson(entry.input, entryMode);
    toast.success('Restored from history');
  };

  const handleClearHistory = () => {
    historyManager.clear('json-formatter');
    setHistory([]);
    toast.success('History cleared');
  };

  const handleFormat = () => {
    const sample = `{
  "name": "John Doe",
  "age": 30,
  "email": "john@example.com",
  "address": {
    "street": "123 Main St",
    "city": "Anytown",
    "zipCode": "12345"
  },
  "hobbies": ["reading", "swimming", "coding"]
}`;
    setInput(sample);
    processJson(sample, mode);
  };

  // AI Functions
  const callAI = async (prompt: string, context?: string) => {
    setAiLoading(true);
    try {
      const response = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'json-formatter',
          action: 'custom',
          input: { prompt, context }
        })
      });

      if (!response.ok) throw new Error('AI request failed');
      
      const data = await response.json();
      return data.result;
    } catch (error) {
      toast.error('AI assistance failed');
      return null;
    } finally {
      setAiLoading(false);
    }
  };

  const autoFixJson = async () => {
    if (!input.trim()) {
      toast.error('Please provide JSON to fix');
      return;
    }

    const prompt = `Fix this malformed JSON and return ONLY the valid JSON without any explanation or markdown:
${input}`;

    const result = await callAI(prompt);
    if (result) {
      // Extract JSON from response (remove markdown if present)
      let cleanJson = result.trim();
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      }
      
      setInput(cleanJson);
      processJson(cleanJson, mode);
      toast.success('JSON auto-fixed successfully');
    }
  };

  const explainError = async (errorMsg: string, jsonText: string) => {
    const prompt = `Explain this JSON error in simple terms and suggest how to fix it:
Error: ${errorMsg}
JSON: ${jsonText.substring(0, 500)}`;

    const result = await callAI(prompt);
    if (result) {
      setErrorExplanation(result);
    }
  };

  const generateFromDescription = async () => {
    if (!description.trim()) {
      toast.error('Please provide a description');
      return;
    }

    const prompt = `Generate a valid JSON object based on this description. Return ONLY the JSON without any explanation or markdown:
${description}`;

    const result = await callAI(prompt);
    if (result) {
      // Extract JSON from response
      let cleanJson = result.trim();
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      }
      
      setInput(cleanJson);
      processJson(cleanJson, mode);
      toast.success('JSON generated from description');
    }
  };

  const generateTypeScript = async () => {
    if (!input.trim() || !isValid) {
      toast.error('Please provide valid JSON first');
      return;
    }

    const prompt = `Generate TypeScript interface/type definitions for this JSON. Return ONLY the TypeScript code without explanations:
${input}`;

    const result = await callAI(prompt);
    if (result) {
      let cleanCode = result.trim();
      if (cleanCode.startsWith('```')) {
        cleanCode = cleanCode.replace(/```typescript?\n?/g, '').replace(/```$/g, '').trim();
      }
      setTypescript(cleanCode);
      toast.success('TypeScript types generated');
    }
  };

  const generateZodSchema = async () => {
    if (!input.trim() || !isValid) {
      toast.error('Please provide valid JSON first');
      return;
    }

    const prompt = `Generate a Zod schema for this JSON. Include proper validation and return ONLY the code:
${input}`;

    const result = await callAI(prompt);
    if (result) {
      let cleanCode = result.trim();
      if (cleanCode.startsWith('```')) {
        cleanCode = cleanCode.replace(/```typescript?\n?/g, '').replace(/```$/g, '').trim();
      }
      setZodSchema(cleanCode);
      toast.success('Zod schema generated');
    }
  };

  const generateOpenAPI = async () => {
    if (!input.trim() || !isValid) {
      toast.error('Please provide valid JSON first');
      return;
    }

    const prompt = `Generate OpenAPI 3.0 schema component for this JSON. Return ONLY the YAML schema:
${input}`;

    const result = await callAI(prompt);
    if (result) {
      let cleanCode = result.trim();
      if (cleanCode.startsWith('```')) {
        cleanCode = cleanCode.replace(/```ya?ml?\n?/g, '').replace(/```$/g, '').trim();
      }
      setOpenApiSpec(cleanCode);
      toast.success('OpenAPI spec generated');
    }
  };

  return (
    <ToolLayout
      title="JSON Formatter & Validator"
      description="Advanced JSON processing with AI-powered fixes, validation, and code generation"
      icon={Code2}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Tool */}
        <div className="lg:col-span-3 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="formatter" onClick={() => setActiveTab('formatter')}>Formatter</TabsTrigger>
              <TabsTrigger value="generate" onClick={() => setActiveTab('generate')}>AI Generate</TabsTrigger>
              <TabsTrigger value="codegen" onClick={() => setActiveTab('codegen')}>Code Gen</TabsTrigger>
            </TabsList>

            {/* Tab 1: JSON Formatter */}
            <TabsContent value="formatter" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">JSON Processor</CardTitle>
                    <div className="flex items-center gap-2">
                      {isValid ? (
                        <Badge variant="default" className="bg-green-500 gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Valid
                        </Badge>
                      ) : error ? (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="w-3 h-3" />
                          Invalid
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        variant={mode === 'format' ? 'default' : 'outline'}
                        onClick={() => handleModeChange('format')}
                        className="gap-2"
                      >
                        <Maximize className="w-4 h-4" />
                        Format
                      </Button>
                      <Button 
                        variant={mode === 'minify' ? 'default' : 'outline'}
                        onClick={() => handleModeChange('minify')}
                        className="gap-2"
                      >
                        <Minimize className="w-4 h-4" />
                        Minify
                      </Button>
                      <Button 
                        variant={mode === 'validate' ? 'default' : 'outline'}
                        onClick={() => handleModeChange('validate')}
                        className="gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Validate
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={autoFixJson}
                        disabled={aiLoading || !input.trim()}
                        className="gap-2"
                      >
                        <Wand2 className="w-4 h-4" />
                        AI Fix
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Input JSON</label>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleFormat}>
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
                          placeholder="Paste your JSON here..."
                          className="min-h-[200px] font-mono text-sm"
                        />
                      </div>

                      {error && (
                        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
                          <CardContent className="pt-4">
                            <div className="flex items-start gap-2">
                              <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="font-medium text-red-700 dark:text-red-400">Validation Error</p>
                                <p className="text-sm text-red-600 dark:text-red-500 mt-1">{error}</p>
                                {errorExplanation && (
                                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-start gap-2">
                                      <Sparkles className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                      <div>
                                        <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">AI Explanation</p>
                                        <p className="text-sm text-blue-600 dark:text-blue-500">{errorExplanation}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">
                            {mode === 'validate' ? 'Validation Result' : 'Output'}
                          </label>
                          {output && mode !== 'validate' && (
                            <CopyButton text={output} label="Copy Result" />
                          )}
                        </div>
                        <Textarea
                          value={output}
                          readOnly
                          placeholder={`${mode === 'format' ? 'Formatted' : mode === 'minify' ? 'Minified' : 'Validation'} JSON will appear here...`}
                          className="min-h-[200px] font-mono text-sm bg-muted/30"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2: AI Generate */}
            <TabsContent value="generate" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Generate JSON from Description
                  </CardTitle>
                  <CardDescription>
                    Describe what you need and AI will generate valid JSON for you
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Example: Create a user profile with name, email, age, address with street and city, and a list of hobbies"
                      className="min-h-[120px]"
                    />
                  </div>
                  <Button 
                    onClick={generateFromDescription}
                    disabled={aiLoading || !description.trim()}
                    className="w-full gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate JSON
                  </Button>

                  {input && (
                    <div className="space-y-2 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Generated JSON</label>
                        <CopyButton text={input} label="Copy JSON" />
                      </div>
                      <Textarea
                        value={input}
                        readOnly
                        className="min-h-[200px] font-mono text-sm bg-muted/30"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 3: Code Generation */}
            <TabsContent value="codegen" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileCode className="w-5 h-5" />
                    Code Generation
                  </CardTitle>
                  <CardDescription>
                    Generate TypeScript types, Zod schemas, and OpenAPI specs from your JSON
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!input || !isValid ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileJson className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Please provide valid JSON in the Formatter tab first</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        <Button 
                          onClick={generateTypeScript}
                          disabled={aiLoading}
                          variant="outline"
                          className="gap-2"
                        >
                          <FileCode className="w-4 h-4" />
                          TypeScript
                        </Button>
                        <Button 
                          onClick={generateZodSchema}
                          disabled={aiLoading}
                          variant="outline"
                          className="gap-2"
                        >
                          <Shield className="w-4 h-4" />
                          Zod Schema
                        </Button>
                        <Button 
                          onClick={generateOpenAPI}
                          disabled={aiLoading}
                          variant="outline"
                          className="gap-2"
                        >
                          <FileJson className="w-4 h-4" />
                          OpenAPI
                        </Button>
                      </div>

                      {typescript && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">TypeScript Types</label>
                            <CopyButton text={typescript} label="Copy" />
                          </div>
                          <Textarea
                            value={typescript}
                            readOnly
                            className="min-h-[200px] font-mono text-sm bg-muted/30"
                          />
                        </div>
                      )}

                      {zodSchema && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Zod Schema</label>
                            <CopyButton text={zodSchema} label="Copy" />
                          </div>
                          <Textarea
                            value={zodSchema}
                            readOnly
                            className="min-h-[200px] font-mono text-sm bg-muted/30"
                          />
                        </div>
                      )}

                      {openApiSpec && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">OpenAPI Specification</label>
                            <CopyButton text={openApiSpec} label="Copy" />
                          </div>
                          <Textarea
                            value={openApiSpec}
                            readOnly
                            className="min-h-[200px] font-mono text-sm bg-muted/30"
                          />
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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
