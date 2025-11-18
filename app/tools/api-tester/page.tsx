
"use client";

import React from 'react';
import { Send, Plus, Trash2, Globe, Clock, CheckCircle, XCircle , Sparkles, Zap, AlertTriangle, FileCode} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIAssistant } from "@/components/ai-assistant";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { ToolLayout } from '@/components/tool-layout';
import { CopyButton } from '@/components/copy-button';
import { HistoryPanel } from '@/components/history-panel';
import { historyManager } from '@/lib/utils';
import type { ToolHistory, ApiRequest } from '@/lib/types';
import { toast } from 'sonner';

const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const;

export default function ApiTesterPage() {
  const [method, setMethod] = React.useState<string>('GET');
  const [url, setUrl] = React.useState('');
  const [headers, setHeaders] = React.useState<Array<{key: string; value: string}>>([{key: '', value: ''}]);
  const [body, setBody] = React.useState('');
  const [response, setResponse] = React.useState<ApiRequest['response'] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [history, setHistory] = React.useState<ToolHistory[]>([]);
  const [activeTab, setActiveTab] = React.useState('headers');
  const [activeResponseTab, setActiveResponseTab] = React.useState('body');
  
  // AI-related state
  const [mainTab, setMainTab] = React.useState('tester'); // 'tester' or 'generate'
  const [aiDescription, setAiDescription] = React.useState('');
  const [aiGenerating, setAiGenerating] = React.useState(false);
  const [aiExplaining, setAiExplaining] = React.useState(false);
  const [aiDetecting, setAiDetecting] = React.useState(false);
  const [responseExplanation, setResponseExplanation] = React.useState('');
  const [detectedIssues, setDetectedIssues] = React.useState<string[]>([]);

  React.useEffect(() => {
    setHistory(historyManager.get('api-tester'));
  }, []);

  const addHeader = () => {
    setHeaders([...headers, {key: '', value: ''}]);
  };

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...headers];
    newHeaders[index][field] = value;
    setHeaders(newHeaders);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const handleSendRequest = async () => {
    if (!url?.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    setLoading(true);
    setResponse(null);
    
    const startTime = Date.now();
    
    try {
      // Prepare headers
      const requestHeaders: Record<string, string> = {};
      headers.forEach(({ key, value }) => {
        if (key?.trim() && value?.trim()) {
          requestHeaders[key] = value;
        }
      });

      // Prepare request options
      const requestOptions: RequestInit = {
        method,
        headers: requestHeaders,
      };

      // Add body for methods that support it
      if (['POST', 'PUT', 'PATCH'].includes(method) && body?.trim()) {
        requestOptions.body = body;
        if (!requestHeaders['Content-Type']) {
          requestHeaders['Content-Type'] = 'application/json';
        }
      }

      const response = await fetch(url, requestOptions);
      const endTime = Date.now();
      
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseBody = '';
      try {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await response.json();
          responseBody = JSON.stringify(json, null, 2);
        } else {
          responseBody = await response.text();
        }
      } catch (err) {
        responseBody = 'Unable to parse response body';
      }

      const apiResponse: ApiRequest['response'] = {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        time: endTime - startTime
      };

      setResponse(apiResponse);

      // Save to history
      historyManager.add('api-tester', {
        input: `${method} ${url}`,
        output: `${apiResponse.status} ${apiResponse.statusText}`,
        metadata: {
          method,
          url,
          status: apiResponse.status,
          time: apiResponse.time,
          hasHeaders: headers.some(h => h.key && h.value),
          hasBody: !!body?.trim()
        }
      });
      setHistory(historyManager.get('api-tester'));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
      toast.error(`Request failed: ${errorMessage}`);
      
      setResponse({
        status: 0,
        statusText: 'Network Error',
        headers: {},
        body: errorMessage,
        time: Date.now() - startTime
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setUrl('');
    setHeaders([{key: '', value: ''}]);
    setBody('');
    setResponse(null);
  };

  const handleRestore = (entry: ToolHistory) => {
    const metadata = entry.metadata;
    if (metadata?.method) setMethod(metadata.method);
    if (metadata?.url) setUrl(metadata.url);
    toast.success('Restored from history');
  };

  const handleClearHistory = () => {
    historyManager.clear('api-tester');
    setHistory([]);
    toast.success('History cleared');
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600 dark:text-green-400';
    if (status >= 400 && status < 500) return 'text-yellow-600 dark:text-yellow-400';
    if (status >= 500) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  // AI Functions
  const handleDetectIssues = async () => {
    if (!url?.trim()) {
      toast.error('Please enter a URL first');
      return;
    }

    setAiDetecting(true);
    setDetectedIssues([]);

    try {
      const requestHeaders: Record<string, string> = {};
      headers.forEach(({ key, value }) => {
        if (key?.trim() && value?.trim()) {
          requestHeaders[key] = value;
        }
      });

      const prompt = `Analyze this API request and detect common errors or issues:

Method: ${method}
URL: ${url}
Headers: ${JSON.stringify(requestHeaders, null, 2)}
Body: ${body || '(empty)'}

Identify issues such as:
- Missing Authorization header
- Incorrect Content-Type
- Body format doesn't match typical schema for this endpoint
- Missing required headers
- CORS potential issues
- Wrong HTTP method for the operation
- Invalid JSON in body
- Missing required parameters in URL

Provide a concise bullet list of detected issues. If no issues found, say "No obvious issues detected."`;

      const res = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, action: 'detect-issues' })
      });

      if (!res.ok) throw new Error('AI detection failed');
      
      const data = await res.json();
      const issues = data.result
        .split('\n')
        .filter((line: string) => line.trim().startsWith('-') || line.trim().startsWith('•'))
        .map((line: string) => line.replace(/^[-•]\s*/, '').trim())
        .filter((line: string) => line.length > 0);

      if (issues.length === 0 || data.result.toLowerCase().includes('no obvious issues')) {
        setDetectedIssues(['✓ No obvious issues detected. Request looks good!']);
        toast.success('No issues detected');
      } else {
        setDetectedIssues(issues);
        toast.warning(`Found ${issues.length} potential issue(s)`);
      }
    } catch (error) {
      toast.error('Failed to detect issues');
      console.error(error);
    } finally {
      setAiDetecting(false);
    }
  };

  const handleGenerateFromDescription = async () => {
    if (!aiDescription?.trim()) {
      toast.error('Please describe the API request you want to make');
      return;
    }

    setAiGenerating(true);

    try {
      const prompt = `Generate a complete API request based on this description:

"${aiDescription}"

Provide the response in this exact format:
METHOD: [HTTP method]
URL: [complete URL]
HEADERS:
[header-name]: [header-value]
...
BODY:
[request body if applicable, or write "none"]

Be specific and realistic. For authentication, include common headers like Authorization with example tokens.`;

      const res = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, action: 'generate-request' })
      });

      if (!res.ok) throw new Error('Failed to generate request');
      
      const data = await res.json();
      const result = data.result;

      // Parse the AI response
      const methodMatch = result.match(/METHOD:\s*(\w+)/i);
      const urlMatch = result.match(/URL:\s*(.+?)(?=\n|HEADERS:|$)/i);
      const headersSection = result.match(/HEADERS:(.*?)(?=BODY:|$)/is);
      const bodySection = result.match(/BODY:(.*?)$/is);

      if (methodMatch) {
        setMethod(methodMatch[1].toUpperCase());
      }

      if (urlMatch) {
        setUrl(urlMatch[1].trim());
      }

      if (headersSection) {
        const headerLines = headersSection[1].trim().split('\n');
        const parsedHeaders = headerLines
          .map((line: string) => {
            const [key, ...valueParts] = line.split(':');
            return {
              key: key?.trim() || '',
              value: valueParts.join(':').trim() || ''
            };
          })
          .filter((h: {key: string; value: string}) => h.key && h.value);
        
        if (parsedHeaders.length > 0) {
          setHeaders(parsedHeaders);
        }
      }

      if (bodySection && !bodySection[1].toLowerCase().includes('none')) {
        const bodyContent = bodySection[1].trim();
        // Try to parse and pretty-print JSON
        try {
          const parsed = JSON.parse(bodyContent);
          setBody(JSON.stringify(parsed, null, 2));
        } catch {
          setBody(bodyContent);
        }
      }

      setMainTab('tester');
      toast.success('API request generated successfully!');
    } catch (error) {
      toast.error('Failed to generate request');
      console.error(error);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleExplainResponse = async () => {
    if (!response) {
      toast.error('No response to explain');
      return;
    }

    setAiExplaining(true);
    setResponseExplanation('');

    try {
      const prompt = `Explain this API response in simple terms:

Status: ${response.status} ${response.statusText}
Response Time: ${response.time}ms
Headers: ${JSON.stringify(response.headers, null, 2)}
Body: ${response.body.substring(0, 1000)}${response.body.length > 1000 ? '...(truncated)' : ''}

Provide:
1. What this status code means
2. Whether the request was successful
3. Any issues or concerns with the response
4. What the response data represents
5. Suggestions if there are errors

Keep it concise and practical.`;

      const res = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, action: 'explain-response' })
      });

      if (!res.ok) throw new Error('Failed to explain response');
      
      const data = await res.json();
      setResponseExplanation(data.result);
      toast.success('Response explained');
    } catch (error) {
      toast.error('Failed to explain response');
      console.error(error);
    } finally {
      setAiExplaining(false);
    }
  };

  return (
    <ToolLayout
      title="API Tester"
      description="Test REST APIs with custom headers, body, and detailed response analysis"
      icon={Send}
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
              <Send className="w-4 h-4" />
              API Tester
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
                  Generate API Request from Description
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Describe the API request you want to make, and AI will generate the complete request with method, URL, headers, and body.
                  </p>
                  <Textarea
                    value={aiDescription}
                    onChange={(e) => setAiDescription(e.target.value)}
                    placeholder="Example: Get all users from JSONPlaceholder API&#10;Example: Create a new todo item with title 'Buy groceries' using the JSONPlaceholder API&#10;Example: Fetch weather data for New York from OpenWeatherMap API"
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
                      Generating Request...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate API Request
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* API Tester Tab */}
          {mainTab === 'tester' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    API Request Builder
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
              {/* Method and URL */}
              <div className="flex gap-3">
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {httpMethods.map((m) => (
                      <SelectItem key={m} value={m}>
                        <span className={`font-semibold ${
                          m === 'GET' ? 'text-blue-600' :
                          m === 'POST' ? 'text-green-600' :
                          m === 'PUT' ? 'text-orange-600' :
                          m === 'DELETE' ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {m}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.example.com/endpoint"
                  className="flex-1"
                />
                <Button onClick={handleSendRequest} disabled={loading} className="gap-2">
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button 
                    variant={activeTab === 'headers' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('headers')}
                    className="flex-1"
                  >
                    Headers
                  </Button>
                  <Button 
                    variant={activeTab === 'body' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('body')}
                    className="flex-1"
                  >
                    Body
                  </Button>
                </div>

                {activeTab === 'headers' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Request Headers</h3>
                    <Button variant="outline" size="sm" onClick={addHeader} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Header
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {headers.map((header, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={header.key}
                          onChange={(e) => updateHeader(index, 'key', e.target.value)}
                          placeholder="Header name"
                          className="flex-1"
                        />
                        <Input
                          value={header.value}
                          onChange={(e) => updateHeader(index, 'value', e.target.value)}
                          placeholder="Header value"
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => removeHeader(index)}
                          disabled={headers.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                )}

                {activeTab === 'body' && (
                <div>
                  <div className="space-y-2">
                    <h3 className="font-medium">Request Body</h3>
                    <Textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder={`Enter request body (JSON, XML, etc.)...\n\nExample:\n{\n  "name": "John Doe",\n  "email": "john@example.com"\n}`}
                      className="min-h-[150px] font-mono text-sm"
                    />
                  </div>
                </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClear}>
                  Clear All
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDetectIssues}
                  disabled={aiDetecting || !url?.trim()}
                  className="gap-2"
                >
                  {aiDetecting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      Detecting...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      AI Detect Issues
                    </>
                  )}
                </Button>
              </div>

              {/* Detected Issues Panel */}
              {detectedIssues.length > 0 && (
                <div className={`p-4 rounded-lg border ${
                  detectedIssues[0].startsWith('✓') 
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                    : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
                }`}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                      detectedIssues[0].startsWith('✓')
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-yellow-600 dark:text-yellow-400'
                    }`} />
                    <div className="flex-1 space-y-2">
                      <h4 className={`font-semibold ${
                        detectedIssues[0].startsWith('✓')
                          ? 'text-green-900 dark:text-green-100'
                          : 'text-yellow-900 dark:text-yellow-100'
                      }`}>
                        {detectedIssues[0].startsWith('✓') ? 'Analysis Complete' : 'Potential Issues Detected'}
                      </h4>
                      <ul className={`space-y-1 text-sm ${
                        detectedIssues[0].startsWith('✓')
                          ? 'text-green-800 dark:text-green-200'
                          : 'text-yellow-800 dark:text-yellow-200'
                      }`}>
                        {detectedIssues.map((issue, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            {!issue.startsWith('✓') && <span className="mt-1">•</span>}
                            <span>{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Response Section */}
          {response && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Send className="w-5 h-5" />
                    Response
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleExplainResponse}
                      disabled={aiExplaining}
                      className="gap-2"
                    >
                      {aiExplaining ? (
                        <>
                          <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                          Explaining...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
                          AI Explain
                        </>
                      )}
                    </Button>
                    <Badge variant="outline" className="gap-1">
                      <Clock className="w-3 h-3" />
                      {response.time}ms
                    </Badge>
                    <Badge 
                      variant={response.status >= 200 && response.status < 300 ? "default" : "destructive"}
                      className="gap-1"
                    >
                      {response.status >= 200 && response.status < 300 ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {response.status} {response.statusText}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* AI Explanation Panel */}
                  {responseExplanation && (
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start gap-3">
                        <Sparkles className="w-5 h-5 flex-shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div className="flex-1 space-y-2">
                          <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                            AI Response Explanation
                          </h4>
                          <div className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                            {responseExplanation}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      variant={activeResponseTab === 'body' ? 'default' : 'outline'}
                      onClick={() => setActiveResponseTab('body')}
                      className="flex-1"
                    >
                      Response Body
                    </Button>
                    <Button 
                      variant={activeResponseTab === 'headers' ? 'default' : 'outline'}
                      onClick={() => setActiveResponseTab('headers')}
                      className="flex-1"
                    >
                      Response Headers
                    </Button>
                  </div>

                  {activeResponseTab === 'body' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Body</h3>
                      <CopyButton text={response.body} label="Copy Body" />
                    </div>
                    <Textarea
                      value={response.body}
                      readOnly
                      className="min-h-[200px] font-mono text-sm bg-muted/30"
                    />
                  </div>
                  )}

                  {activeResponseTab === 'headers' && (
                    <div className="space-y-2">
                      <h3 className="font-medium">Headers</h3>
                      <div className="space-y-1">
                        {Object.entries(response.headers).map(([key, value]) => (
                          <div key={key} className="flex gap-2 py-2 border-b border-border/30 last:border-b-0">
                            <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 min-w-0 flex-shrink-0">
                              {key}:
                            </span>
                            <span className="font-mono text-sm text-muted-foreground break-all">
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
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
