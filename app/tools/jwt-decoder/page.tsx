
"use client";

import React from 'react';
import { Key, Shield, CheckCircle, XCircle, Eye, Copy , ShieldAlert, Info, Sparkles} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIAssistant } from "@/components/ai-assistant";
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToolLayout } from '@/components/tool-layout';
import { CopyButton } from '@/components/copy-button';
import { HistoryPanel } from '@/components/history-panel';
import { jwtUtils, historyManager } from '@/lib/utils';
import type { ToolHistory, JWTDecoded } from '@/lib/types';
import { toast } from 'sonner';

export default function JwtDecoderPage() {
  const [input, setInput] = React.useState('');
  const [decoded, setDecoded] = React.useState<JWTDecoded>({
    header: {},
    payload: {},
    signature: '',
    isValid: true
  });
  const [history, setHistory] = React.useState<ToolHistory[]>([]);
  
  // AI features state
  const [aiSecurityAnalysis, setAiSecurityAnalysis] = React.useState('');
  const [aiRecommendations, setAiRecommendations] = React.useState('');
  const [aiClaimsExplanation, setAiClaimsExplanation] = React.useState('');
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState('');

  React.useEffect(() => {
    setHistory(historyManager.get('jwt-decoder'));
  }, []);

  const decodeJWT = (token: string) => {
    if (!token?.trim()) {
      setDecoded({
        header: {},
        payload: {},
        signature: '',
        isValid: true
      });
      return;
    }

    const result = jwtUtils.decode(token);
    setDecoded(result);
    
    // Save to history if valid
    if (result.isValid) {
      historyManager.add('jwt-decoder', {
        input: token,
        output: JSON.stringify({ header: result.header, payload: result.payload }),
        metadata: { 
          hasHeader: Object.keys(result.header).length > 0,
          hasPayload: Object.keys(result.payload).length > 0,
          algorithm: result.header?.alg || 'unknown'
        }
      });
      setHistory(historyManager.get('jwt-decoder'));
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    decodeJWT(value);
  };

  const handleClear = () => {
    setInput('');
    setDecoded({
      header: {},
      payload: {},
      signature: '',
      isValid: true
    });
  };

  const handleRestore = (entry: ToolHistory) => {
    setInput(entry.input);
    decodeJWT(entry.input);
    toast.success('Restored from history');
  };

  const handleClearHistory = () => {
    historyManager.clear('jwt-decoder');
    setHistory([]);
    toast.success('History cleared');
  };

  const handleSample = () => {
    const sample = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    setInput(sample);
    decodeJWT(sample);
  };

  // AI handler functions
  const handleAISecurityAnalysis = async () => {
    if (!input || !decoded.isValid) {
      toast.error('Please provide a valid JWT token');
      return;
    }

    setAiLoading(true);
    setAiError('');
    
    try {
      const response = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'jwt-decoder',
          action: 'security-analysis',
          input: {
            header: decoded.header,
            payload: decoded.payload,
            token: input
          }
        })
      });

      if (!response.ok) throw new Error('Failed to get security analysis');
      
      const data = await response.json();
      setAiSecurityAnalysis(data.result || data.analysis || 'No analysis generated');
      toast.success('Security analysis complete');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to analyze security';
      setAiError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIRecommendations = async () => {
    if (!input || !decoded.isValid) {
      toast.error('Please provide a valid JWT token');
      return;
    }

    setAiLoading(true);
    setAiError('');
    
    try {
      const response = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'jwt-decoder',
          action: 'recommendations',
          input: {
            header: decoded.header,
            payload: decoded.payload
          }
        })
      });

      if (!response.ok) throw new Error('Failed to get recommendations');
      
      const data = await response.json();
      setAiRecommendations(data.result || data.recommendations || 'No recommendations generated');
      toast.success('Recommendations generated');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to generate recommendations';
      setAiError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIExplainClaims = async () => {
    if (!input || !decoded.isValid) {
      toast.error('Please provide a valid JWT token');
      return;
    }

    setAiLoading(true);
    setAiError('');
    
    try {
      const response = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'jwt-decoder',
          action: 'explain-claims',
          input: {
            payload: decoded.payload
          }
        })
      });

      if (!response.ok) throw new Error('Failed to explain claims');
      
      const data = await response.json();
      setAiClaimsExplanation(data.result || data.explanation || 'No explanation generated');
      toast.success('Claims explained');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to explain claims';
      setAiError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setAiLoading(false);
    }
  };

  const formatJson = (obj: any): string => {
    return JSON.stringify(obj, null, 2);
  };

  const getExpirationInfo = (payload: any) => {
    if (!payload?.exp) return null;
    
    const expDate = new Date(payload.exp * 1000);
    const now = new Date();
    const isExpired = expDate < now;
    
    return {
      date: expDate.toLocaleString(),
      isExpired,
      timeLeft: isExpired ? null : expDate.getTime() - now.getTime()
    };
  };

  const expInfo = getExpirationInfo(decoded.payload);

  return (
    <ToolLayout
      title="JWT Decoder"
      description="Decode and analyze JSON Web Tokens with header, payload, and signature"
      icon={Key}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Tool */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  JWT Decoder
                </CardTitle>
                <div className="flex items-center gap-2">
                  {decoded.isValid ? (
                    <Badge variant="default" className="bg-green-500 gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Valid Format
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="w-3 h-3" />
                      Invalid
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">JWT Token</label>
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
                  placeholder="Paste your JWT token here..."
                  className="min-h-[100px] font-mono text-sm"
                />
              </div>

              {decoded.error && (
                <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-700 dark:text-red-400">Decode Error</p>
                        <p className="text-sm text-red-600 dark:text-red-500 mt-1">{decoded.error}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {decoded.isValid && input && (
                <>
                  {/* Token Info */}
                  {expInfo && (
                    <Card className={`${expInfo.isExpired ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20' : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20'}`}>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                          {expInfo.isExpired ? (
                            <XCircle className="w-5 h-5 text-red-500" />
                          ) : (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          )}
                          <div>
                            <p className="font-medium">
                              {expInfo.isExpired ? 'Token Expired' : 'Token Active'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Expires: {expInfo.date}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Decoded Sections */}
                  <Tabs defaultValue="header" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="header" className="gap-2">
                        <Eye className="w-4 h-4" />
                        Header
                      </TabsTrigger>
                      <TabsTrigger value="payload" className="gap-2">
                        <Key className="w-4 h-4" />
                        Payload
                      </TabsTrigger>
                      <TabsTrigger value="signature" className="gap-2">
                        <Shield className="w-4 h-4" />
                        Signature
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="header">
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Header</CardTitle>
                            {Object.keys(decoded.header).length > 0 && (
                              <CopyButton text={formatJson(decoded.header)} label="Copy Header" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Textarea
                            value={formatJson(decoded.header)}
                            readOnly
                            placeholder="Header information will appear here..."
                            className="min-h-[150px] font-mono text-sm bg-muted/30"
                          />
                          {decoded.header?.alg && (
                            <div className="mt-3 flex gap-2">
                              <Badge variant="outline">
                                Algorithm: {decoded.header.alg}
                              </Badge>
                              {decoded.header?.typ && (
                                <Badge variant="outline">
                                  Type: {decoded.header.typ}
                                </Badge>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="payload">
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Payload</CardTitle>
                            {Object.keys(decoded.payload).length > 0 && (
                              <CopyButton text={formatJson(decoded.payload)} label="Copy Payload" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Textarea
                            value={formatJson(decoded.payload)}
                            readOnly
                            placeholder="Payload data will appear here..."
                            className="min-h-[200px] font-mono text-sm bg-muted/30"
                          />
                          
                          {/* Standard Claims Info */}
                          {Object.keys(decoded.payload).length > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className="text-sm font-medium">Standard Claims:</p>
                              <div className="flex flex-wrap gap-2">
                                {decoded.payload?.iss && (
                                  <Badge variant="outline">Issuer: {decoded.payload.iss}</Badge>
                                )}
                                {decoded.payload?.sub && (
                                  <Badge variant="outline">Subject: {decoded.payload.sub}</Badge>
                                )}
                                {decoded.payload?.aud && (
                                  <Badge variant="outline">Audience: {decoded.payload.aud}</Badge>
                                )}
                                {decoded.payload?.iat && (
                                  <Badge variant="outline">
                                    Issued: {new Date(decoded.payload.iat * 1000).toLocaleString()}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="signature">
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Signature</CardTitle>
                            {decoded.signature && (
                              <CopyButton text={decoded.signature} label="Copy Signature" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <Textarea
                              value={decoded.signature}
                              readOnly
                              placeholder="Signature will appear here..."
                              className="min-h-[100px] font-mono text-sm bg-muted/30"
                            />
                            <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
                              <CardContent className="pt-4">
                                <div className="flex items-start gap-2">
                                  <Shield className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                                      Signature Verification
                                    </p>
                                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                      This tool only decodes the JWT structure. To verify the signature, 
                                      you need the secret key or public key used to sign the token.
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>

                  {/* AI Features */}
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        AI Security Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* AI Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleAISecurityAnalysis}
                          disabled={aiLoading}
                          className="gap-2"
                        >
                          <ShieldAlert className="w-4 h-4" />
                          {aiLoading ? 'Analyzing...' : 'AI Analyze Security'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleAIRecommendations}
                          disabled={aiLoading}
                          className="gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          {aiLoading ? 'Generating...' : 'AI Recommendations'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleAIExplainClaims}
                          disabled={aiLoading}
                          className="gap-2"
                        >
                          <Info className="w-4 h-4" />
                          {aiLoading ? 'Explaining...' : 'AI Explain Claims'}
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

                      {/* AI Security Analysis Result */}
                      {aiSecurityAnalysis && (
                        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
                                Security Vulnerabilities
                              </CardTitle>
                              <CopyButton text={aiSecurityAnalysis} size="sm" />
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <pre className="whitespace-pre-wrap text-sm bg-white dark:bg-gray-900 p-3 rounded border">
                                {aiSecurityAnalysis}
                              </pre>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* AI Recommendations Result */}
                      {aiRecommendations && (
                        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                Configuration Recommendations
                              </CardTitle>
                              <CopyButton text={aiRecommendations} size="sm" />
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <pre className="whitespace-pre-wrap text-sm bg-white dark:bg-gray-900 p-3 rounded border">
                                {aiRecommendations}
                              </pre>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* AI Claims Explanation Result */}
                      {aiClaimsExplanation && (
                        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                Claims Explanation
                              </CardTitle>
                              <CopyButton text={aiClaimsExplanation} size="sm" />
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <pre className="whitespace-pre-wrap text-sm bg-white dark:bg-gray-900 p-3 rounded border">
                                {aiClaimsExplanation}
                              </pre>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </CardContent>
                  </Card>
                </>
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
