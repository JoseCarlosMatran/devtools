
"use client";

import React from 'react';
import { GitCompare, Eye, EyeOff, RotateCcw , Sparkles, GitMerge, XCircle} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIAssistant } from "@/components/ai-assistant";
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToolLayout } from '@/components/tool-layout';
import { CopyButton } from '@/components/copy-button';
import { HistoryPanel } from '@/components/history-panel';
import { historyManager } from '@/lib/utils';
import type { ToolHistory, DiffResult } from '@/lib/types';
import { toast } from 'sonner';
import * as Diff from 'diff';

export default function DiffCheckerPage() {
  const [text1, setText1] = React.useState('');
  const [text2, setText2] = React.useState('');
  const [ignoreWhitespace, setIgnoreWhitespace] = React.useState(false);
  const [diffType, setDiffType] = React.useState<'lines' | 'words'>('lines');
  const [differences, setDifferences] = React.useState<DiffResult[]>([]);
  const [stats, setStats] = React.useState({ added: 0, removed: 0, unchanged: 0 });
  const [history, setHistory] = React.useState<ToolHistory[]>([]);
  const [activeTab, setActiveTab] = React.useState('unified');
  
  // AI features state
  const [aiSummary, setAiSummary] = React.useState('');
  const [aiMeaningfulChanges, setAiMeaningfulChanges] = React.useState('');
  const [aiMergedVersion, setAiMergedVersion] = React.useState('');
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState('');

  React.useEffect(() => {
    setHistory(historyManager.get('diff-checker'));
  }, []);

  const calculateDiff = (text1: string, text2: string) => {
    if (!text1 && !text2) {
      setDifferences([]);
      setStats({ added: 0, removed: 0, unchanged: 0 });
      return;
    }

    let processedText1 = text1;
    let processedText2 = text2;

    if (ignoreWhitespace) {
      processedText1 = text1.replace(/\s+/g, ' ').trim();
      processedText2 = text2.replace(/\s+/g, ' ').trim();
    }

    let changes: any[] = [];
    
    if (diffType === 'lines') {
      changes = Diff.diffLines(processedText1, processedText2);
    } else {
      changes = Diff.diffWordsWithSpace(processedText1, processedText2);
    }

    const results: DiffResult[] = changes?.map((change: any) => ({
      type: change.added ? 'added' : change.removed ? 'removed' : 'unchanged',
      value: change.value,
      count: change.count
    })) || [];

    const newStats = {
      added: results.filter(r => r.type === 'added').length,
      removed: results.filter(r => r.type === 'removed').length,
      unchanged: results.filter(r => r.type === 'unchanged').length
    };

    setDifferences(results);
    setStats(newStats);

    // Save to history if there are differences
    if (newStats.added > 0 || newStats.removed > 0) {
      historyManager.add('diff-checker', {
        input: `Text comparison (${diffType})`,
        output: `${newStats.added} additions, ${newStats.removed} deletions`,
        metadata: {
          diffType,
          ignoreWhitespace,
          stats: newStats,
          text1Length: text1.length,
          text2Length: text2.length
        }
      });
      setHistory(historyManager.get('diff-checker'));
    }
  };

  React.useEffect(() => {
    calculateDiff(text1, text2);
  }, [text1, text2, ignoreWhitespace, diffType]);

  const handleText1Change = (value: string) => {
    setText1(value);
  };

  const handleText2Change = (value: string) => {
    setText2(value);
  };

  const handleClear = () => {
    setText1('');
    setText2('');
    setDifferences([]);
    setStats({ added: 0, removed: 0, unchanged: 0 });
  };

  const handleSwap = () => {
    const temp = text1;
    setText1(text2);
    setText2(temp);
  };

  const handleRestore = (entry: ToolHistory) => {
    const metadata = entry.metadata;
    if (metadata?.diffType) setDiffType(metadata.diffType);
    if (typeof metadata?.ignoreWhitespace === 'boolean') setIgnoreWhitespace(metadata.ignoreWhitespace);
    toast.success('Restored settings from history');
  };

  const handleClearHistory = () => {
    historyManager.clear('diff-checker');
    setHistory([]);
    toast.success('History cleared');
  };

  const handleSample = () => {
    const sample1 = `The quick brown fox jumps over the lazy dog.
This is the first line of text.
Common line that exists in both texts.
This line will be modified.
Last line of the first text.`;

    const sample2 = `The quick brown fox leaps over the lazy dog.
This is the first line of text.
Common line that exists in both texts.
This line has been modified significantly.
Additional line added here.
Last line of the second text.`;

    setText1(sample1);
    setText2(sample2);
  };

  // AI handler functions
  const handleAISummarize = async () => {
    if (!text1 || !text2) {
      toast.error('Please provide both texts to compare');
      return;
    }

    setAiLoading(true);
    setAiError('');
    
    try {
      const response = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'diff-checker',
          action: 'summarize',
          input: {
            originalText: text1,
            newText: text2,
            stats: stats
          }
        })
      });

      if (!response.ok) throw new Error('Failed to get AI summary');
      
      const data = await response.json();
      setAiSummary(data.result || data.summary || 'No summary generated');
      toast.success('AI summary generated');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to generate summary';
      setAiError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIMeaningfulChanges = async () => {
    if (!text1 || !text2) {
      toast.error('Please provide both texts to compare');
      return;
    }

    setAiLoading(true);
    setAiError('');
    
    try {
      const response = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'diff-checker',
          action: 'analyze-meaningful',
          input: {
            originalText: text1,
            newText: text2,
            differences: differences
          }
        })
      });

      if (!response.ok) throw new Error('Failed to analyze changes');
      
      const data = await response.json();
      setAiMeaningfulChanges(data.result || data.analysis || 'No analysis generated');
      toast.success('Meaningful changes detected');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to analyze changes';
      setAiError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIMerge = async () => {
    if (!text1 || !text2) {
      toast.error('Please provide both texts to compare');
      return;
    }

    setAiLoading(true);
    setAiError('');
    
    try {
      const response = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'diff-checker',
          action: 'suggest-merge',
          input: {
            originalText: text1,
            newText: text2
          }
        })
      });

      if (!response.ok) throw new Error('Failed to generate merge suggestion');
      
      const data = await response.json();
      setAiMergedVersion(data.result || data.merged || 'No merge suggestion generated');
      toast.success('Merge suggestion generated');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to generate merge';
      setAiError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setAiLoading(false);
    }
  };

  const renderDiffView = () => {
    if (differences.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
          No differences to display
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {differences.map((diff, index) => (
          <div
            key={index}
            className={`p-2 rounded border-l-4 font-mono text-sm whitespace-pre-wrap break-words ${
              diff.type === 'added' 
                ? 'bg-green-50 dark:bg-green-950/20 border-green-500 text-green-800 dark:text-green-200' 
                : diff.type === 'removed' 
                ? 'bg-red-50 dark:bg-red-950/20 border-red-500 text-red-800 dark:text-red-200' 
                : 'bg-muted/30 border-gray-300 dark:border-gray-600'
            }`}
          >
            <span className={`inline-block w-4 text-xs font-semibold mr-2 ${
              diff.type === 'added' ? 'text-green-600 dark:text-green-400' :
              diff.type === 'removed' ? 'text-red-600 dark:text-red-400' : 
              'text-gray-500'
            }`}>
              {diff.type === 'added' ? '+' : diff.type === 'removed' ? '-' : ' '}
            </span>
            {diff.value}
          </div>
        ))}
      </div>
    );
  };

  const renderSideBySide = () => {
    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');
    const maxLines = Math.max(lines1.length, lines2.length);

    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <h4 className="font-medium text-sm text-red-600 dark:text-red-400">Original</h4>
          <div className="border rounded p-2 bg-red-50/50 dark:bg-red-950/10 min-h-[200px]">
            {Array.from({ length: maxLines }, (_, i) => (
              <div key={i} className="font-mono text-sm py-1 flex">
                <span className="w-8 text-xs text-muted-foreground mr-2 flex-shrink-0">
                  {i + 1}
                </span>
                <span className="break-all">{lines1[i] || ''}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <h4 className="font-medium text-sm text-green-600 dark:text-green-400">New</h4>
          <div className="border rounded p-2 bg-green-50/50 dark:bg-green-950/10 min-h-[200px]">
            {Array.from({ length: maxLines }, (_, i) => (
              <div key={i} className="font-mono text-sm py-1 flex">
                <span className="w-8 text-xs text-muted-foreground mr-2 flex-shrink-0">
                  {i + 1}
                </span>
                <span className="break-all">{lines2[i] || ''}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <ToolLayout
      title="Diff Checker"
      description="Compare texts side-by-side with highlighted differences and unified view"
      icon={GitCompare}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Tool */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <GitCompare className="w-5 h-5" />
                  Text Comparison
                </CardTitle>
                <div className="flex items-center gap-2">
                  {stats.added > 0 && (
                    <Badge variant="outline" className="text-green-600 dark:text-green-400">
                      +{stats.added}
                    </Badge>
                  )}
                  {stats.removed > 0 && (
                    <Badge variant="outline" className="text-red-600 dark:text-red-400">
                      -{stats.removed}
                    </Badge>
                  )}
                  {stats.unchanged > 0 && (
                    <Badge variant="outline">
                      ={stats.unchanged}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Options */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ignoreWhitespace"
                      checked={ignoreWhitespace}
                      onCheckedChange={(checked) => setIgnoreWhitespace(!!checked)}
                    />
                    <label htmlFor="ignoreWhitespace" className="text-sm font-medium cursor-pointer">
                      Ignore whitespace
                    </label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Compare by:</span>
                    <Button
                      variant={diffType === 'lines' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDiffType('lines')}
                    >
                      Lines
                    </Button>
                    <Button
                      variant={diffType === 'words' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDiffType('words')}
                    >
                      Words
                    </Button>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleSample}>
                    Load Sample
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSwap} className="gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Swap
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleClear}>
                    Clear
                  </Button>
                </div>
              </div>

              {/* Input Texts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-red-600 dark:text-red-400">
                    Original Text
                  </label>
                  <Textarea
                    value={text1}
                    onChange={(e) => handleText1Change(e.target.value)}
                    placeholder="Paste your original text here..."
                    className="min-h-[150px] font-mono text-sm border-red-200 dark:border-red-800"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-green-600 dark:text-green-400">
                    New Text
                  </label>
                  <Textarea
                    value={text2}
                    onChange={(e) => handleText2Change(e.target.value)}
                    placeholder="Paste your new text here..."
                    className="min-h-[150px] font-mono text-sm border-green-200 dark:border-green-800"
                  />
                </div>
              </div>

              {/* Results */}
              {(text1 || text2) && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Comparison Results</CardTitle>
                      <div className="flex items-center gap-2">
                        {differences.length > 0 && (
                          <CopyButton 
                            text={differences.map(d => `${d.type === 'added' ? '+' : d.type === 'removed' ? '-' : ' '}${d.value}`).join('')}
                            label="Copy Diff" 
                            size="sm" 
                          />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="unified" className="gap-2" onClick={() => setActiveTab('unified')}>
                          <Eye className="w-4 h-4" />
                          Unified View
                        </TabsTrigger>
                        <TabsTrigger value="sidebyside" className="gap-2" onClick={() => setActiveTab('sidebyside')}>
                          <GitCompare className="w-4 h-4" />
                          Side by Side
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="unified">
                        <div className="border rounded-lg p-4 bg-muted/30 max-h-96 overflow-auto">
                          {renderDiffView()}
                        </div>
                      </TabsContent>

                      <TabsContent value="sidebyside">
                        <div className="max-h-96 overflow-auto">
                          {renderSideBySide()}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}

              {/* AI Features */}
              {(text1 && text2) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-500" />
                      AI-Powered Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* AI Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleAISummarize}
                        disabled={aiLoading}
                        className="gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        {aiLoading ? 'Generating...' : 'AI Summarize Changes'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleAIMeaningfulChanges}
                        disabled={aiLoading}
                        className="gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        {aiLoading ? 'Analyzing...' : 'AI Detect Meaningful Changes'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleAIMerge}
                        disabled={aiLoading}
                        className="gap-2"
                      >
                        <GitMerge className="w-4 h-4" />
                        {aiLoading ? 'Merging...' : 'AI Suggest Merge'}
                      </Button>
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

                    {/* AI Summary Result */}
                    {aiSummary && (
                      <Card className="border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/20">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                              Change Summary (Commit-style)
                            </CardTitle>
                            <CopyButton text={aiSummary} size="sm" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <pre className="whitespace-pre-wrap text-sm bg-white dark:bg-gray-900 p-3 rounded border">
                              {aiSummary}
                            </pre>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* AI Meaningful Changes Result */}
                    {aiMeaningfulChanges && (
                      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              Meaningful Changes Analysis
                            </CardTitle>
                            <CopyButton text={aiMeaningfulChanges} size="sm" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <pre className="whitespace-pre-wrap text-sm bg-white dark:bg-gray-900 p-3 rounded border">
                              {aiMeaningfulChanges}
                            </pre>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* AI Merge Suggestion Result */}
                    {aiMergedVersion && (
                      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <GitMerge className="w-4 h-4 text-green-600 dark:text-green-400" />
                              Suggested Merged Version
                            </CardTitle>
                            <CopyButton text={aiMergedVersion} size="sm" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Textarea
                            value={aiMergedVersion}
                            readOnly
                            className="min-h-[200px] font-mono text-sm bg-white dark:bg-gray-900"
                          />
                        </CardContent>
                      </Card>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Statistics */}
              {(stats.added > 0 || stats.removed > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {stats.added}
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-300">
                        Added {diffType}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {stats.removed}
                      </div>
                      <div className="text-sm text-red-700 dark:text-red-300">
                        Removed {diffType}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-muted/30">
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold text-muted-foreground">
                        {stats.unchanged}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Unchanged {diffType}
                      </div>
                    </CardContent>
                  </Card>
                </div>
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
