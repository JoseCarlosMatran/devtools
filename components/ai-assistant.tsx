
'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Sparkles, Loader2, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

interface AIAssistantProps {
  tool: string
  actions: {
    id: string
    label: string
    description: string
    icon?: React.ReactNode
    requiresInput?: boolean
  }[]
  onResult: (action: string, result: any) => void
  getInputForAction: (action: string) => any
}

export function AIAssistant({ tool, actions, onResult, getInputForAction }: AIAssistantProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [result, setResult] = useState<{ action: string; content: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleAction = async (actionId: string) => {
    try {
      setLoading(actionId)
      setResult(null)
      
      const input = getInputForAction(actionId)
      
      const response = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool,
          action: actionId,
          input
        })
      })

      if (!response.ok) {
        throw new Error('AI request failed')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let partialRead = ''

      while (true) {
        const { done, value } = await reader!.read()
        if (done) break

        partialRead += decoder.decode(value, { stream: true })
        let lines = partialRead.split('\n')
        partialRead = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              
              if (parsed.status === 'streaming') {
                buffer += parsed.content
              } else if (parsed.status === 'completed') {
                const finalResult = typeof parsed.result === 'string' 
                  ? parsed.result 
                  : buffer || JSON.stringify(parsed.result, null, 2)
                
                setResult({ action: actionId, content: finalResult })
                onResult(actionId, parsed.result)
                toast.success('IA completada')
              } else if (parsed.status === 'error') {
                throw new Error(parsed.message || 'AI processing failed')
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('AI error:', error)
      toast.error('Error al procesar la solicitud de IA')
    } finally {
      setLoading(null)
    }
  }

  const copyResult = async () => {
    if (!result) return
    
    try {
      await navigator.clipboard.writeText(result.content)
      setCopied(true)
      toast.success('Copiado al portapapeles')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Error al copiar')
    }
  }

  return (
    <Card className="border-purple-200 dark:border-purple-900 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          Asistente IA
        </CardTitle>
        <CardDescription>
          Usa inteligencia artificial para mejorar tu experiencia
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {actions.map((action) => (
            <Button
              key={action.id}
              onClick={() => handleAction(action.id)}
              disabled={!!loading}
              variant="outline"
              className="justify-start h-auto py-3 px-4"
            >
              {loading === action.id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : action.icon ? (
                <span className="mr-2">{action.icon}</span>
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              <div className="flex flex-col items-start">
                <span className="font-medium">{action.label}</span>
                <span className="text-xs text-muted-foreground">{action.description}</span>
              </div>
            </Button>
          ))}
        </div>

        {result && (
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Resultado de IA</CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyResult}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md max-h-96 overflow-y-auto">
                {result.content}
              </pre>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}
