"use client";

import { useState, useEffect } from "react";
import { format } from "sql-formatter";
import { ToolLayout } from "@/components/tool-layout";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/copy-button";
import { AIAssistant } from "@/components/ai-assistant";
import { Wand2, Trash2, Zap, MessageSquare, Sparkles, Database, XCircle, Code2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function SQLFormatterPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [activeTab, setActiveTab] = useState('formatter');
  
  // AI features state
  const [aiOptimized, setAiOptimized] = useState('');
  const [aiExplanation, setAiExplanation] = useState('');
  const [aiDialectConversion, setAiDialectConversion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [selectedDialect, setSelectedDialect] = useState('postgresql');

  useEffect(() => {
    const saved = localStorage.getItem("sql-formatter-input");
    if (saved) setInput(saved);
  }, []);

  const handleFormat = () => {
    try {
      const formatted = format(input, {
        language: "sql",
        tabWidth: 2,
        keywordCase: "upper",
      });
      setOutput(formatted);
      localStorage.setItem("sql-formatter-input", input);
      toast.success("SQL formateado correctamente");
    } catch (error) {
      toast.error("Error: SQL inválido");
      setOutput("");
    }
  };

  const handleClear = () => {
    setInput("");
    setOutput("");
    setAiOptimized("");
    setAiExplanation("");
    setAiDialectConversion("");
    setAiError("");
    localStorage.removeItem("sql-formatter-input");
  };

  // AI handler functions
  const handleAIOptimize = async () => {
    if (!input) {
      toast.error('Please provide a SQL query');
      return;
    }

    setAiLoading(true);
    setAiError('');
    
    try {
      const response = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'sql-formatter',
          action: 'optimize',
          input: {
            query: input
          }
        })
      });

      if (!response.ok) throw new Error('Failed to optimize query');
      
      const data = await response.json();
      setAiOptimized(data.result || data.optimized || 'No optimization generated');
      toast.success('Query optimized');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to optimize';
      setAiError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIExplain = async () => {
    if (!input) {
      toast.error('Please provide a SQL query');
      return;
    }

    setAiLoading(true);
    setAiError('');
    
    try {
      const response = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'sql-formatter',
          action: 'explain',
          input: {
            query: input
          }
        })
      });

      if (!response.ok) throw new Error('Failed to explain query');
      
      const data = await response.json();
      setAiExplanation(data.result || data.explanation || 'No explanation generated');
      toast.success('Query explained');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to explain';
      setAiError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIConvertDialect = async () => {
    if (!input) {
      toast.error('Please provide a SQL query');
      return;
    }

    setAiLoading(true);
    setAiError('');
    
    try {
      const response = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'sql-formatter',
          action: 'convert-dialect',
          input: {
            query: input,
            targetDialect: selectedDialect
          }
        })
      });

      if (!response.ok) throw new Error('Failed to convert dialect');
      
      const data = await response.json();
      setAiDialectConversion(data.result || data.converted || 'No conversion generated');
      toast.success(`Converted to ${selectedDialect}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to convert';
      setAiError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <ToolLayout
      title="SQL Formatter"
      description="Format, optimize, and convert SQL queries with AI-powered analysis"
      icon={Database}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="w-5 h-5" />
              SQL Query Input
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Paste your SQL query here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
            
            <div className="flex gap-3">
              <Button onClick={handleFormat} disabled={!input} className="flex-1">
                <Wand2 className="h-4 w-4 mr-2" />
                Format SQL
              </Button>
              <Button onClick={handleClear} variant="outline">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>

            {/* Sample Queries */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Samples:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setInput(
                    "SELECT id, name, email FROM users WHERE status = 'active' ORDER BY created_at DESC"
                  )
                }
              >
                Simple SELECT
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setInput(
                    "INSERT INTO users (name, email, password) VALUES ('John Doe', 'john@example.com', 'hashed_password')"
                  )
                }
              >
                INSERT
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setInput(
                    "SELECT u.id, u.name, COUNT(o.id) as order_count FROM users u LEFT JOIN orders o ON u.id = o.user_id GROUP BY u.id HAVING COUNT(o.id) > 5"
                  )
                }
              >
                JOIN with GROUP BY
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Formatted Output */}
        {output && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Formatted SQL</CardTitle>
                <CopyButton text={output} />
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={output}
                readOnly
                rows={10}
                className="font-mono text-sm bg-muted/30"
              />
            </CardContent>
          </Card>
        )}

        {/* AI Features */}
        {input && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                AI-Powered SQL Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* AI Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleAIOptimize}
                  disabled={aiLoading}
                  className="gap-2"
                >
                  <Zap className="w-4 h-4" />
                  {aiLoading ? 'Optimizing...' : 'AI Optimize Query'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleAIExplain}
                  disabled={aiLoading}
                  className="gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  {aiLoading ? 'Explaining...' : 'AI Explain Query'}
                </Button>
                <div className="flex gap-2 items-center">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleAIConvertDialect}
                    disabled={aiLoading}
                    className="gap-2"
                  >
                    <Code2 className="w-4 h-4" />
                    {aiLoading ? 'Converting...' : 'AI Convert to'}
                  </Button>
                  <select
                    value={selectedDialect}
                    onChange={(e) => setSelectedDialect(e.target.value)}
                    className="h-8 px-2 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                    <option value="sqlite">SQLite</option>
                    <option value="mssql">MS SQL Server</option>
                    <option value="oracle">Oracle</option>
                  </select>
                </div>
              </div>

              {/* AI Error Display */}
              {aiError && (
                <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-700 dark:text-red-400">AI Error</p>
                        <p className="text-sm text-red-600 dark:text-red-500 mt-1">{aiError}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Optimization Result */}
              {aiOptimized && (
                <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />
                        Optimized Query & Recommendations
                      </CardTitle>
                      <CopyButton text={aiOptimized} size="sm" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <pre className="whitespace-pre-wrap text-sm bg-white dark:bg-gray-900 p-3 rounded border">
                        {aiOptimized}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Explanation Result */}
              {aiExplanation && (
                <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        Query Explanation
                      </CardTitle>
                      <CopyButton text={aiExplanation} size="sm" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <pre className="whitespace-pre-wrap text-sm bg-white dark:bg-gray-900 p-3 rounded border">
                        {aiExplanation}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Dialect Conversion Result */}
              {aiDialectConversion && (
                <Card className="border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        Converted to {selectedDialect.toUpperCase()}
                      </CardTitle>
                      <CopyButton text={aiDialectConversion} size="sm" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={aiDialectConversion}
                      readOnly
                      className="min-h-[200px] font-mono text-sm bg-white dark:bg-gray-900"
                    />
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </ToolLayout>
  );
}
