
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToolLayout } from "@/components/tool-layout"
import { Sparkles, Code2, Download, Copy, Loader2, GitBranch, Zap, FileText, CheckCircle, XCircle, Info } from "lucide-react"
import { toast } from "sonner"

type Platform = "n8n" | "make" | "node-red" | "zapier"

const platforms = [
  { value: "n8n", label: "n8n", description: "Workflow automation tool" },
  { value: "make", label: "Make (Integromat)", description: "Visual automation platform" },
  { value: "node-red", label: "Node-RED", description: "Flow-based development tool" },
  { value: "zapier", label: "Zapier", description: "No-code automation platform" },
]

const templates = [
  {
    id: "gmail-to-slack",
    title: "Gmail → Slack Notifications",
    description: "Envía notificación a Slack cuando llega un email importante",
    platforms: ["n8n", "make", "zapier"]
  },
  {
    id: "hubspot-to-mailchimp",
    title: "HubSpot → Mailchimp Sync",
    description: "Sincroniza nuevos contactos de HubSpot a Mailchimp",
    platforms: ["n8n", "make", "zapier"]
  },
  {
    id: "twitter-to-database",
    title: "Twitter → Database",
    description: "Guarda tweets con hashtag específico en base de datos",
    platforms: ["n8n", "make", "node-red"]
  },
  {
    id: "trello-reminder",
    title: "Trello Task Reminder",
    description: "Recordatorio en Slack para tareas próximas a vencer",
    platforms: ["n8n", "make", "zapier"]
  },
  {
    id: "weekly-report",
    title: "Weekly Sales Report",
    description: "Genera y envía reporte semanal de ventas por email",
    platforms: ["n8n", "make"]
  },
  {
    id: "email-to-jira",
    title: "Email → Jira Ticket",
    description: "Crea ticket en Jira cuando llega email con 'Bug:' en asunto",
    platforms: ["n8n", "make", "zapier"]
  }
]

export default function WorkflowGenerator() {
  const [description, setDescription] = useState("")
  const [platform, setPlatform] = useState<Platform>("n8n")
  const [generatedCode, setGeneratedCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<string>("input")
  const [workflowExplanation, setWorkflowExplanation] = useState("")
  const [isExplaining, setIsExplaining] = useState(false)
  const [jsonValid, setJsonValid] = useState<boolean | null>(null)

  const useTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setDescription(template.description)
      toast.success(`Plantilla "${template.title}" cargada`)
    }
  }

  const validateJSON = (code: string): boolean => {
    try {
      JSON.parse(code)
      return true
    } catch {
      return false
    }
  }

  const generateWorkflow = async () => {
    if (!description.trim()) {
      toast.error("Por favor, describe el flujo de trabajo que quieres crear")
      return
    }

    if (!platform) {
      toast.error("Por favor, selecciona una plataforma")
      return
    }

    setIsLoading(true)
    setError("")
    setWorkflowExplanation("")
    setJsonValid(null)

    try {
      const response = await fetch("/api/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_workflow",
          description: description,
          platform: platform,
        }),
      })

      if (!response.ok) {
        throw new Error("Error al generar el workflow")
      }

      const data = await response.json()
      const code = data.result
      setGeneratedCode(code)
      
      // Validar JSON
      const isValid = validateJSON(code)
      setJsonValid(isValid)
      
      if (!isValid) {
        toast.warning("El código generado podría tener errores de formato")
      }
      
      setActiveTab("code")
      toast.success("¡Workflow generado exitosamente!")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setError(errorMessage)
      toast.error("Error al generar el workflow")
    } finally {
      setIsLoading(false)
    }
  }

  const explainWorkflow = async () => {
    if (!generatedCode) {
      toast.error("Primero genera un workflow")
      return
    }

    setIsExplaining(true)
    setError("")

    try {
      const response = await fetch("/api/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "explain_workflow",
          code: generatedCode,
          platform: platform,
        }),
      })

      if (!response.ok) {
        throw new Error("Error al explicar el workflow")
      }

      const data = await response.json()
      setWorkflowExplanation(data.result)
      toast.success("Explicación generada")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setError(errorMessage)
      toast.error("Error al explicar el workflow")
    } finally {
      setIsExplaining(false)
    }
  }

  const copyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode)
      toast.success("Código copiado al portapapeles")
    }
  }

  const downloadCode = () => {
    if (generatedCode) {
      const blob = new Blob([generatedCode], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `workflow-${platform}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Archivo descargado")
    }
  }

  const selectedPlatform = platforms.find(p => p.value === platform)

  return (
    <ToolLayout
      title="Workflow Code Generator"
      description="Genera código para automatizaciones en n8n, Make, Node-RED y Zapier"
      icon={GitBranch}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="input" onClick={() => setActiveTab("input")}>
            <Sparkles className="h-4 w-4 mr-2" />
            Describir
          </TabsTrigger>
          <TabsTrigger value="code" disabled={!generatedCode} onClick={() => setActiveTab("code")}>
            <Code2 className="h-4 w-4 mr-2" />
            Código
          </TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Describe tu automatización
              </CardTitle>
              <CardDescription>
                Explica qué quieres automatizar y la IA generará el código para la plataforma que elijas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Plataforma</label>
                <Select value={platform} onValueChange={(value) => setPlatform(value as Platform)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una plataforma" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{p.label}</span>
                          <span className="text-xs text-muted-foreground">{p.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPlatform && (
                  <p className="text-xs text-muted-foreground">
                    {selectedPlatform.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Descripción del Workflow</label>
                <Textarea
                  placeholder="Ejemplo: Cuando reciba un email en Gmail, extraer los archivos adjuntos, subirlos a Google Drive, y enviar una notificación en Slack con el enlace del archivo."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={8}
                  className="resize-none"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={generateWorkflow}
                  disabled={isLoading || !description.trim() || !platform}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Generar Workflow
                    </>
                  )}
                </Button>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 p-4 rounded-lg space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  📝 Plantillas Rápidas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {templates
                    .filter(t => t.platforms.includes(platform))
                    .map((template) => (
                      <Button
                        key={template.id}
                        variant="outline"
                        size="sm"
                        onClick={() => useTemplate(template.id)}
                        className="justify-start h-auto py-2 px-3 text-left bg-white hover:bg-purple-50 border-purple-200"
                      >
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-xs font-semibold text-purple-900">{template.title}</span>
                          <span className="text-xs text-muted-foreground">{template.description}</span>
                        </div>
                      </Button>
                    ))}
                </div>
                {templates.filter(t => t.platforms.includes(platform)).length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No hay plantillas disponibles para {selectedPlatform?.label}
                  </p>
                )}
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  💡 Ejemplos de workflows personalizados
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Sincronizar nuevos contactos de HubSpot a Mailchimp</li>
                  <li>Guardar tweets con un hashtag específico en una base de datos</li>
                  <li>Enviar recordatorio por Slack cuando una tarea de Trello esté próxima a vencer</li>
                  <li>Generar reporte semanal de ventas y enviarlo por email</li>
                  <li>Crear ticket en Jira cuando llegue un email con "Bug:" en el asunto</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="code" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Code2 className="h-5 w-5 text-green-500" />
                    Código Generado - {selectedPlatform?.label}
                  </CardTitle>
                  <CardDescription>
                    Código listo para importar en {selectedPlatform?.label}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyCode}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadCode}>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar JSON
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {generatedCode ? (
                <div className="space-y-4">
                  {/* JSON Validation Status */}
                  {jsonValid !== null && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                      jsonValid 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      {jsonValid ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium text-green-900">
                            ✅ JSON válido - Listo para importar
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 text-red-600" />
                          <span className="text-sm font-medium text-red-900">
                            ⚠️ JSON inválido - Revisa el código antes de importar
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  <div className="relative">
                    <pre className="bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm max-h-[600px]">
                      <code>{generatedCode}</code>
                    </pre>
                  </div>

                  {/* Explain Workflow Button */}
                  <div className="flex justify-center">
                    <Button
                      onClick={explainWorkflow}
                      disabled={isExplaining}
                      variant="outline"
                      className="gap-2"
                    >
                      {isExplaining ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generando explicación...
                        </>
                      ) : (
                        <>
                          <Info className="h-4 w-4" />
                          Explicar qué hace este workflow
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Workflow Explanation */}
                  {workflowExplanation && (
                    <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 p-4 rounded-lg space-y-2">
                      <h4 className="text-sm font-semibold text-purple-900 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Explicación del Workflow
                      </h4>
                      <div className="text-sm text-purple-900 whitespace-pre-wrap">
                        {workflowExplanation}
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-2">
                    <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                      📋 Instrucciones de uso para {selectedPlatform?.label}
                    </h4>
                    {platform === "n8n" && (
                      <div className="text-sm text-blue-800 space-y-1">
                        <p>1. Abre n8n y ve a "Workflows"</p>
                        <p>2. Haz clic en el menú ⋮ y selecciona "Import from File"</p>
                        <p>3. Sube el archivo JSON descargado o pega el código</p>
                        <p>4. Configura las credenciales de cada nodo</p>
                        <p>5. Activa el workflow</p>
                      </div>
                    )}
                    {platform === "make" && (
                      <div className="text-sm text-blue-800 space-y-1">
                        <p>1. Abre Make y ve a "Scenarios"</p>
                        <p>2. Haz clic en "Create a new scenario"</p>
                        <p>3. Haz clic en el menú ⋮ y selecciona "Import Blueprint"</p>
                        <p>4. Pega el código JSON</p>
                        <p>5. Conecta tus cuentas y servicios</p>
                      </div>
                    )}
                    {platform === "node-red" && (
                      <div className="text-sm text-blue-800 space-y-1">
                        <p>1. Abre Node-RED</p>
                        <p>2. Haz clic en el menú hamburguesa ☰</p>
                        <p>3. Selecciona "Import" → "Clipboard"</p>
                        <p>4. Pega el código JSON</p>
                        <p>5. Haz clic en "Import" y despliega</p>
                      </div>
                    )}
                    {platform === "zapier" && (
                      <div className="text-sm text-blue-800 space-y-1">
                        <p>1. Abre Zapier y ve a "My Zaps"</p>
                        <p>2. Haz clic en "Create Zap"</p>
                        <p>3. Usa el código como referencia para configurar cada paso</p>
                        <p>4. Configura los triggers y actions según el JSON</p>
                        <p>5. Conecta tus apps y activa el Zap</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay código para mostrar</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </ToolLayout>
  )
}
