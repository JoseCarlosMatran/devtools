
"use client";

import React from 'react';
import { Search, Lightbulb, Flag, CheckCircle, XCircle, Wand2, MessageSquare, Sparkles, Zap, AlertTriangle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToolLayout } from '@/components/tool-layout';
import { CopyButton } from '@/components/copy-button';
import { HistoryPanel } from '@/components/history-panel';
import { AIAssistant } from '@/components/ai-assistant';
import { historyManager } from '@/lib/utils';
import type { ToolHistory } from '@/lib/types';
import { toast } from 'sonner';

const commonPatterns = [
  { name: 'Email', pattern: '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$' },
  { name: 'Phone (US)', pattern: '^\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}$' },
  { name: 'URL', pattern: 'https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)' },
  { name: 'IP Address', pattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$' },
  { name: 'Credit Card', pattern: '^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})$' },
  { name: 'Hex Color', pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$' },
  { name: 'HTML Tag', pattern: '<\\/?[a-z][\\s\\S]*>' },
  { name: 'Alphanumeric', pattern: '^[a-zA-Z0-9]+$' }
];

export default function RegexTesterPage() {
  const [pattern, setPattern] = React.useState('');
  const [testText, setTestText] = React.useState('');
  const [flags, setFlags] = React.useState({
    global: true,
    ignoreCase: false,
    multiline: false
  });
  const [matches, setMatches] = React.useState<RegExpMatchArray[]>([]);
  const [isValid, setIsValid] = React.useState(true);
  const [error, setError] = React.useState<string>('');
  const [highlightedText, setHighlightedText] = React.useState<string>('');
  const [history, setHistory] = React.useState<ToolHistory[]>([]);
  
  // AI-related state
  const [mainTab, setMainTab] = React.useState('tester'); // 'tester' or 'generate'
  const [aiDescription, setAiDescription] = React.useState('');
  const [aiGenerating, setAiGenerating] = React.useState(false);
  const [aiExplaining, setAiExplaining] = React.useState(false);
  const [aiDetecting, setAiDetecting] = React.useState(false);
  const [patternExplanation, setPatternExplanation] = React.useState('');
  const [detectedDangers, setDetectedDangers] = React.useState<string[]>([]);

  React.useEffect(() => {
    setHistory(historyManager.get('regex-tester'));
  }, []);

  const buildFlags = () => {
    let flagString = '';
    if (flags.global) flagString += 'g';
    if (flags.ignoreCase) flagString += 'i';
    if (flags.multiline) flagString += 'm';
    return flagString;
  };

  const testRegex = (regexPattern: string, text: string) => {
    if (!regexPattern || !text) {
      setMatches([]);
      setHighlightedText(text);
      setIsValid(true);
      setError('');
      return;
    }

    try {
      const flagString = buildFlags();
      const regex = new RegExp(regexPattern, flagString);
      setIsValid(true);
      setError('');

      const allMatches: RegExpMatchArray[] = [];
      let highlighted = text;
      
      if (flags.global) {
        let match;
        const globalRegex = new RegExp(regexPattern, flagString);
        while ((match = globalRegex.exec(text)) !== null) {
          allMatches.push(match);
          if (!flags.global) break;
        }
      } else {
        const match = text.match(regex);
        if (match) {
          allMatches.push(match);
        }
      }

      // Create highlighted text
      if (allMatches.length > 0) {
        const sortedMatches = [...allMatches].sort((a, b) => (b.index || 0) - (a.index || 0));
        for (const match of sortedMatches) {
          if (match.index !== undefined) {
            const matchText = match[0];
            const before = highlighted.substring(0, match.index);
            const after = highlighted.substring(match.index + matchText.length);
            highlighted = before + `<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">${matchText}</mark>` + after;
          }
        }
      }

      setMatches(allMatches);
      setHighlightedText(highlighted);

      // Save to history if there are matches
      if (allMatches.length > 0) {
        historyManager.add('regex-tester', {
          input: regexPattern,
          output: `${allMatches.length} matches found`,
          metadata: {
            pattern: regexPattern,
            flags: flagString,
            matchCount: allMatches.length,
            testText: text.length > 100 ? text.substring(0, 100) + '...' : text
          }
        });
        setHistory(historyManager.get('regex-tester'));
      }

    } catch (err) {
      setIsValid(false);
      setError(err instanceof Error ? err.message : 'Invalid regular expression');
      setMatches([]);
      setHighlightedText(text);
    }
  };

  const handlePatternChange = (newPattern: string) => {
    setPattern(newPattern);
    testRegex(newPattern, testText);
  };

  const handleTextChange = (newText: string) => {
    setTestText(newText);
    testRegex(pattern, newText);
  };

  const handleFlagChange = (flag: keyof typeof flags, checked: boolean) => {
    const newFlags = { ...flags, [flag]: checked };
    setFlags(newFlags);
    testRegex(pattern, testText);
  };

  const handleCommonPattern = (commonPattern: string) => {
    setPattern(commonPattern);
    testRegex(commonPattern, testText);
  };

  const handleClear = () => {
    setPattern('');
    setTestText('');
    setMatches([]);
    setHighlightedText('');
    setIsValid(true);
    setError('');
  };

  const handleRestore = (entry: ToolHistory) => {
    const metadata = entry.metadata;
    if (metadata?.pattern) {
      setPattern(metadata.pattern);
      testRegex(metadata.pattern, testText);
    }
    toast.success('Restored from history');
  };

  const handleClearHistory = () => {
    historyManager.clear('regex-tester');
    setHistory([]);
    toast.success('History cleared');
  };

  const handleSample = () => {
    const samplePattern = '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b';
    const sampleText = `Contact us at support@example.com or sales@company.org
For urgent matters, reach out to admin@domain.co.uk
Invalid emails: notanemail.com, @invalid.com`;
    
    setPattern(samplePattern);
    setTestText(sampleText);
    testRegex(samplePattern, sampleText);
  };

  // AI Functions
  const handleExplainPattern = async () => {
    if (!pattern?.trim()) {
      toast.error('Please enter a regex pattern first');
      return;
    }

    setAiExplaining(true);
    setPatternExplanation('');

    try {
      const prompt = `Explain this regular expression pattern in detail:

Pattern: /${pattern}/${buildFlags()}

Provide:
1. A plain English explanation of what this pattern matches
2. Break down each component of the regex
3. Explain what each special character or sequence does
4. Give examples of text that would match
5. Give examples of text that would NOT match
6. Mention any edge cases or limitations

Keep it clear and educational.`;

      const res = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, action: 'explain-pattern' })
      });

      if (!res.ok) throw new Error('Failed to explain pattern');
      
      const data = await res.json();
      setPatternExplanation(data.result);
      toast.success('Pattern explained');
    } catch (error) {
      toast.error('Failed to explain pattern');
      console.error(error);
    } finally {
      setAiExplaining(false);
    }
  };

  const handleDetectDangers = async () => {
    if (!pattern?.trim()) {
      toast.error('Please enter a regex pattern first');
      return;
    }

    setAiDetecting(true);
    setDetectedDangers([]);

    try {
      const prompt = `Analyze this regular expression for dangerous patterns and performance issues:

Pattern: /${pattern}/${buildFlags()}

Check for:
1. **Catastrophic backtracking**: Nested quantifiers like (a+)+ or (a*)*
2. **Exponential complexity**: Patterns that can cause regex engine to hang
3. **Unescaped special characters**: Characters that should be escaped
4. **Overly greedy quantifiers**: .* that may match too much
5. **Missing anchors**: Patterns that might match unexpectedly
6. **Inefficient alternations**: Multiple similar alternatives that could be combined
7. **ReDoS vulnerabilities**: Regex Denial of Service attack vectors
8. **Character class issues**: Redundant or inefficient character classes

Provide a concise bullet list of detected issues. If the pattern is safe and efficient, say "✓ No dangerous patterns detected. Pattern is safe and efficient."`;

      const res = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, action: 'detect-dangers' })
      });

      if (!res.ok) throw new Error('Failed to detect dangers');
      
      const data = await res.json();
      const dangers = data.result
        .split('\n')
        .filter((line: string) => line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().startsWith('✓'))
        .map((line: string) => line.replace(/^[-•]\s*/, '').trim())
        .filter((line: string) => line.length > 0);

      if (dangers.length === 0 || data.result.toLowerCase().includes('no dangerous patterns')) {
        setDetectedDangers(['✓ No dangerous patterns detected. Pattern is safe and efficient.']);
        toast.success('Pattern is safe');
      } else {
        setDetectedDangers(dangers);
        toast.warning(`Found ${dangers.length} potential issue(s)`);
      }
    } catch (error) {
      toast.error('Failed to detect dangers');
      console.error(error);
    } finally {
      setAiDetecting(false);
    }
  };

  const handleGenerateFromDescription = async () => {
    if (!aiDescription?.trim()) {
      toast.error('Please describe what you want to match');
      return;
    }

    setAiGenerating(true);

    try {
      const prompt = `Generate an optimal regular expression based on this description:

"${aiDescription}"

Provide the response in this exact format:
PATTERN: [the regex pattern without delimiters]
FLAGS: [recommended flags: g, i, m, or combinations]
EXPLANATION: [brief explanation of how the pattern works]
EXAMPLES:
- Match: [example that matches]
- Match: [another example that matches]
- No Match: [example that doesn't match]

Make the pattern:
1. Efficient and performant
2. Safe (no catastrophic backtracking)
3. Clear and maintainable
4. Properly escaped`;

      const res = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, action: 'generate-regex' })
      });

      if (!res.ok) throw new Error('Failed to generate regex');
      
      const data = await res.json();
      const result = data.result;

      // Parse the AI response
      const patternMatch = result.match(/PATTERN:\s*(.+?)(?=\n|FLAGS:|$)/i);
      const flagsMatch = result.match(/FLAGS:\s*(.+?)(?=\n|EXPLANATION:|$)/i);
      const explanationMatch = result.match(/EXPLANATION:\s*(.+?)(?=\n|EXAMPLES:|$)/is);

      if (patternMatch) {
        const generatedPattern = patternMatch[1].trim();
        setPattern(generatedPattern);
        testRegex(generatedPattern, testText);
      }

      if (flagsMatch) {
        const flagStr = flagsMatch[1].trim().toLowerCase();
        setFlags({
          global: flagStr.includes('g'),
          ignoreCase: flagStr.includes('i'),
          multiline: flagStr.includes('m')
        });
      }

      if (explanationMatch) {
        setPatternExplanation(explanationMatch[1].trim());
      }

      setMainTab('tester');
      toast.success('Regex pattern generated successfully!');
    } catch (error) {
      toast.error('Failed to generate regex');
      console.error(error);
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <ToolLayout
      title="Regex Tester & Generator"
      description="Test regular expressions with real-time matching and pattern explanation"
      icon={Search}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Tool */}
        <div className="lg:col-span-3 space-y-6">
          {/* Main Tab Switcher */}
          <div className="flex gap-2">
            <Button 
              variant={mainTab === 'tester' ? 'default' : 'outline'}
              onClick={() => setMainTab('tester')}
              className="flex-1 gap-2"
            >
              <Search className="w-4 h-4" />
              Regex Tester
            </Button>
            <Button 
              variant={mainTab === 'generate' ? 'default' : 'outline'}
              onClick={() => setMainTab('generate')}
              className="flex-1 gap-2"
            >
              <Sparkles className="w-4 h-4" />
              AI Generate
            </Button>
          </div>

          {/* AI Generate Tab */}
          {mainTab === 'generate' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  Generate Regex from Description
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Describe what you want to match, and AI will generate an optimal regex pattern for you.
                  </p>
                  <Textarea
                    value={aiDescription}
                    onChange={(e) => setAiDescription(e.target.value)}
                    placeholder="Example: Match valid email addresses&#10;Example: Match US phone numbers in various formats&#10;Example: Match URLs starting with http or https&#10;Example: Match dates in YYYY-MM-DD format"
                    className="min-h-[150px]"
                  />
                </div>
                <Button 
                  onClick={handleGenerateFromDescription}
                  disabled={aiGenerating || !aiDescription?.trim()}
                  className="w-full gap-2"
                >
                  {aiGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating Pattern...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Regex Pattern
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Regex Tester Tab */}
          {mainTab === 'tester' && (
            <>
              <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Regex Tester
                </CardTitle>
                <div className="flex items-center gap-2">
                  {isValid ? (
                    <Badge variant="default" className="bg-green-500 gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Valid
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="w-3 h-3" />
                      Invalid
                    </Badge>
                  )}
                  {matches.length > 0 && (
                    <Badge variant="outline">
                      {matches.length} match{matches.length !== 1 ? 'es' : ''}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Pattern Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Regular Expression Pattern</label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleSample}>
                      Load Sample
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleClear}>
                      Clear
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="text-lg font-mono text-muted-foreground">/</span>
                  <Input
                    value={pattern}
                    onChange={(e) => handlePatternChange(e.target.value)}
                    placeholder="Enter your regex pattern here..."
                    className="font-mono"
                  />
                  <span className="text-lg font-mono text-muted-foreground">/{buildFlags()}</span>
                </div>
              </div>

              {/* Flags */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Flag className="w-4 h-4" />
                  Flags
                </label>
                <div className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="global"
                      checked={flags.global}
                      onCheckedChange={(checked) => handleFlagChange('global', !!checked)}
                    />
                    <label htmlFor="global" className="text-sm font-medium cursor-pointer">
                      Global (g)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ignoreCase"
                      checked={flags.ignoreCase}
                      onCheckedChange={(checked) => handleFlagChange('ignoreCase', !!checked)}
                    />
                    <label htmlFor="ignoreCase" className="text-sm font-medium cursor-pointer">
                      Ignore Case (i)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="multiline"
                      checked={flags.multiline}
                      onCheckedChange={(checked) => handleFlagChange('multiline', !!checked)}
                    />
                    <label htmlFor="multiline" className="text-sm font-medium cursor-pointer">
                      Multiline (m)
                    </label>
                  </div>
                </div>
              </div>

              {/* AI Action Buttons */}
              {pattern && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleExplainPattern}
                    disabled={aiExplaining || !pattern?.trim()}
                    className="flex-1 gap-2"
                  >
                    {aiExplaining ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        Explaining...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4" />
                        AI Explain Pattern
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleDetectDangers}
                    disabled={aiDetecting || !pattern?.trim()}
                    className="flex-1 gap-2"
                  >
                    {aiDetecting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        Detecting...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        AI Detect Dangers
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Pattern Explanation Panel */}
              {patternExplanation && (
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 flex-shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                        Pattern Explanation
                      </h4>
                      <div className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                        {patternExplanation}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Detected Dangers Panel */}
              {detectedDangers.length > 0 && (
                <div className={`p-4 rounded-lg border ${
                  detectedDangers[0].startsWith('✓') 
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                }`}>
                  <div className="flex items-start gap-3">
                    <Shield className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                      detectedDangers[0].startsWith('✓')
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`} />
                    <div className="flex-1 space-y-2">
                      <h4 className={`font-semibold ${
                        detectedDangers[0].startsWith('✓')
                          ? 'text-green-900 dark:text-green-100'
                          : 'text-red-900 dark:text-red-100'
                      }`}>
                        {detectedDangers[0].startsWith('✓') ? 'Safety Analysis' : 'Security & Performance Warnings'}
                      </h4>
                      <ul className={`space-y-1 text-sm ${
                        detectedDangers[0].startsWith('✓')
                          ? 'text-green-800 dark:text-green-200'
                          : 'text-red-800 dark:text-red-200'
                      }`}>
                        {detectedDangers.map((danger, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            {!danger.startsWith('✓') && <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                            <span>{danger}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-700 dark:text-red-400">Regex Error</p>
                        <p className="text-sm text-red-600 dark:text-red-500 mt-1">{error}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Test Text */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Test Text</label>
                <Textarea
                  value={testText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder="Enter text to test your regex against..."
                  className="min-h-[150px] font-mono text-sm"
                />
              </div>

              {/* Highlighted Results */}
              {testText && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Results with Highlighting</label>
                    {matches.length > 0 && (
                      <CopyButton text={matches.map(m => m[0]).join('\n')} label="Copy Matches" size="sm" />
                    )}
                  </div>
                  <Card className="bg-muted/30">
                    <CardContent className="pt-4">
                      <div 
                        className="font-mono text-sm whitespace-pre-wrap break-words"
                        dangerouslySetInnerHTML={{ __html: highlightedText || testText }}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Match Details */}
              {matches.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Match Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {matches.map((match, index) => (
                        <div key={index} className="p-3 border border-border/50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline">Match {index + 1}</Badge>
                            <CopyButton text={match[0]} size="sm" />
                          </div>
                          <div className="space-y-1 text-sm">
                            <p><strong>Match:</strong> <code className="bg-muted px-1 rounded">{match[0]}</code></p>
                            <p><strong>Position:</strong> {match.index} - {(match.index || 0) + match[0].length - 1}</p>
                            {match.length > 1 && (
                              <div>
                                <strong>Groups:</strong>
                                <ul className="ml-4 mt-1">
                                  {match.slice(1).map((group, groupIndex) => (
                                    <li key={groupIndex}>
                                      Group {groupIndex + 1}: <code className="bg-muted px-1 rounded">{group || 'undefined'}</code>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Common Patterns */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Common Patterns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {commonPatterns.map((p, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleCommonPattern(p.pattern)}
                    className="justify-start h-auto py-2 px-3"
                  >
                    <div className="text-left">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {p.pattern.length > 25 ? `${p.pattern.substring(0, 25)}...` : p.pattern}
                      </p>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
            </>
          )}
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
