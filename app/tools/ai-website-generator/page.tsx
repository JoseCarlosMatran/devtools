
"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ToolLayout } from "@/components/tool-layout"
import { Sparkles, Eye, Code2, Download, Copy, Loader2, Globe, Check, Clock, Rocket, ExternalLink, ChevronRight, ChevronLeft, Upload, X, Image as ImageIcon, Palette, FileText, LayoutTemplate } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import Link from "next/link"

interface GenerationStep {
  id: number
  title: string
  status: 'pending' | 'processing' | 'completed'
  description: string
}

interface UploadedImage {
  id: string
  file: File
  preview: string
  cloudPath?: string
  purpose: 'logo' | 'hero' | 'product' | 'other'
}

export default function AIWebsiteGenerator() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  
  // Wizard states
  const [wizardStep, setWizardStep] = useState(1)
  const [pageType, setPageType] = useState("")
  const [visualStyle, setVisualStyle] = useState("")
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  
  // Content states
  const [websiteTitle, setWebsiteTitle] = useState("")
  const [websiteDescription, setWebsiteDescription] = useState("")
  const [ctaText, setCtaText] = useState("")
  const [additionalInfo, setAdditionalInfo] = useState("")
  
  const [description, setDescription] = useState("")
  const [generatedHTML, setGeneratedHTML] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<string>("input")
  const [modificationPrompt, setModificationPrompt] = useState("")
  const [isModifying, setIsModifying] = useState(false)
  const [modificationHistory, setModificationHistory] = useState<string[]>([])
  
  // Progress tracking states
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [codePreview, setCodePreview] = useState("")
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([
    { id: 1, title: "Analizando descripción", status: 'pending', description: "Procesando tu solicitud..." },
    { id: 2, title: "Diseñando estructura HTML", status: 'pending', description: "Creando la estructura de la página..." },
    { id: 3, title: "Generando estilos CSS", status: 'pending', description: "Aplicando diseño y colores..." },
    { id: 4, title: "Agregando JavaScript", status: 'pending', description: "Añadiendo interactividad..." },
    { id: 5, title: "Optimizando código", status: 'pending', description: "Finalizando y optimizando..." },
  ])

  // Publishing states
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [publishTitle, setPublishTitle] = useState("")
  const [publishDescription, setPublishDescription] = useState("")
  const [publishSubdomain, setPublishSubdomain] = useState("")
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishedUrl, setPublishedUrl] = useState("")
  
  // Page type options
  const pageTypes = [
    { value: "landing", label: "Landing Page", description: "Página de aterrizaje para captar clientes" },
    { value: "portfolio", label: "Portfolio", description: "Muestra tu trabajo y proyectos" },
    { value: "ecommerce", label: "E-commerce", description: "Tienda online para vender productos" },
    { value: "restaurant", label: "Restaurante", description: "Menú y reservas para tu restaurante" },
    { value: "blog", label: "Blog", description: "Comparte artículos y contenido" },
    { value: "corporate", label: "Corporativo", description: "Sitio profesional para empresa" },
    { value: "personal", label: "Personal", description: "Sitio web personal o CV" },
    { value: "other", label: "Otro", description: "Tipo personalizado" },
  ]
  
  // Visual style options
  const visualStyles = [
    { 
      value: "modern", 
      label: "Moderno", 
      description: "Diseño limpio con gradientes y sombras suaves",
      colors: ["#667eea", "#764ba2", "#f093fb"]
    },
    { 
      value: "minimal", 
      label: "Minimalista", 
      description: "Espacios en blanco, tipografía clara, sin distracciones",
      colors: ["#000000", "#ffffff", "#f5f5f5"]
    },
    { 
      value: "colorful", 
      label: "Colorido", 
      description: "Vibrante, enérgico, con colores brillantes",
      colors: ["#ff6b6b", "#4ecdc4", "#ffe66d"]
    },
    { 
      value: "elegant", 
      label: "Elegante", 
      description: "Sofisticado, serif fonts, colores oscuros",
      colors: ["#1a1a2e", "#16213e", "#c79f60"]
    },
    { 
      value: "playful", 
      label: "Juguetón", 
      description: "Divertido, rounded corners, ilustraciones",
      colors: ["#ff9ff3", "#feca57", "#48dbfb"]
    },
    { 
      value: "tech", 
      label: "Tech/Futurista", 
      description: "Cyber, neón, high-tech aesthetic",
      colors: ["#0f0f0f", "#00ff41", "#00d4ff"]
    },
  ]
  
  // Image handling functions
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, purpose: 'logo' | 'hero' | 'product' | 'other') => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, sube solo archivos de imagen")
      return
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen debe ser menor a 5MB")
      return
    }

    // Create preview
    const preview = URL.createObjectURL(file)
    const newImage: UploadedImage = {
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview,
      purpose,
    }

    setUploadedImages(prev => [...prev, newImage])
    toast.success("Imagen agregada")
  }

  const removeImage = (id: string) => {
    setUploadedImages(prev => {
      const image = prev.find(img => img.id === id)
      if (image) {
        URL.revokeObjectURL(image.preview)
      }
      return prev.filter(img => img.id !== id)
    })
    toast.success("Imagen eliminada")
  }

  const uploadImagesToCloud = async (): Promise<Map<string, string>> => {
    const imageUrls = new Map<string, string>()
    
    for (const image of uploadedImages) {
      try {
        const formData = new FormData()
        formData.append('file', image.file)
        formData.append('purpose', image.purpose)

        const response = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error('Error al subir imagen')
        }

        const data = await response.json()
        imageUrls.set(image.purpose, data.url)
      } catch (error) {
        console.error('Error uploading image:', error)
        toast.error(`Error al subir imagen ${image.purpose}`)
      }
    }

    return imageUrls
  }

  const nextStep = () => {
    if (wizardStep < 4) {
      setWizardStep(wizardStep + 1)
    }
  }

  const prevStep = () => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1)
    }
  }
  
  const canProceedToNextStep = () => {
    switch (wizardStep) {
      case 1:
        return pageType !== ""
      case 2:
        return visualStyle !== ""
      case 3:
        return true // Images are optional
      case 4:
        return websiteTitle.trim() !== ""
      default:
        return false
    }
  }

  const simulateProgress = async () => {
    // Reset steps
    setGenerationSteps([
      { id: 1, title: "Analizando descripción", status: 'pending', description: "Procesando tu solicitud..." },
      { id: 2, title: "Diseñando estructura HTML", status: 'pending', description: "Creando la estructura de la página..." },
      { id: 3, title: "Generando estilos CSS", status: 'pending', description: "Aplicando diseño y colores..." },
      { id: 4, title: "Agregando JavaScript", status: 'pending', description: "Añadiendo interactividad..." },
      { id: 5, title: "Optimizando código", status: 'pending', description: "Finalizando y optimizando..." },
    ])

    const codeSnippets = [
      '<!DOCTYPE html>\n<html lang="es">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '\n  <title>Mi Página Web</title>\n  <style>\n    * { margin: 0; padding: 0; box-sizing: border-box; }',
      '\n    body {\n      font-family: Arial, sans-serif;\n      line-height: 1.6;\n      color: #333;\n    }',
      '\n    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }\n  </style>\n</head>',
      '\n<body>\n  <div class="container">\n    <h1>Bienvenido</h1>\n  </div>\n</body>\n</html>',
    ]

    for (let i = 0; i < 5; i++) {
      // Update step status to processing
      setGenerationSteps(prev => prev.map(step => 
        step.id === i + 1 ? { ...step, status: 'processing' } : step
      ))
      setCurrentStep(i)
      setProgress((i + 1) * 20)

      // Simulate code being written
      if (i < codeSnippets.length) {
        setCodePreview(prev => prev + codeSnippets[i])
      }

      // Wait before completing this step
      await new Promise(resolve => setTimeout(resolve, 1200))

      // Mark step as completed
      setGenerationSteps(prev => prev.map(step => 
        step.id === i + 1 ? { ...step, status: 'completed' } : step
      ))
    }
  }

  const generateWebsite = async () => {
    if (!websiteTitle.trim()) {
      toast.error("Por favor, completa el título de tu página web")
      return
    }

    setIsLoading(true)
    setError("")
    setModificationHistory([])
    setShowProgressModal(true)
    setProgress(0)
    setCodePreview("")
    setIsUploadingImages(true)

    try {
      // Upload images to cloud first
      const imageUrls = await uploadImagesToCloud()
      setIsUploadingImages(false)
      
      // Build comprehensive description from wizard data
      const pageTypeInfo = pageTypes.find(pt => pt.value === pageType)
      const styleInfo = visualStyles.find(vs => vs.value === visualStyle)
      
      let fullDescription = `Crea un ${pageTypeInfo?.label || 'sitio web'} con estilo ${styleInfo?.label || 'moderno'}.\n\n`
      fullDescription += `Título: ${websiteTitle}\n`
      fullDescription += `Descripción: ${websiteDescription || 'N/A'}\n`
      
      if (ctaText) {
        fullDescription += `Call-to-action: ${ctaText}\n`
      }
      
      if (additionalInfo) {
        fullDescription += `\nInformación adicional: ${additionalInfo}\n`
      }
      
      if (styleInfo) {
        fullDescription += `\nPaleta de colores: ${styleInfo.colors.join(', ')}\n`
        fullDescription += `Estilo visual: ${styleInfo.description}\n`
      }
      
      // Add image URLs if any
      if (imageUrls.size > 0) {
        fullDescription += `\nImágenes disponibles:\n`
        imageUrls.forEach((url, purpose) => {
          fullDescription += `- ${purpose}: ${url}\n`
        })
      }
      
      // Start progress simulation
      const simulationPromise = simulateProgress()
      
      // Make actual API call
      const response = await fetch("/api/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_website",
          description: fullDescription,
          pageType: pageType,
          visualStyle: visualStyle,
          imageUrls: Array.from(imageUrls.entries()),
        }),
      })

      if (!response.ok) {
        throw new Error("Error al generar la página web")
      }

      // Wait for both to complete
      const [data] = await Promise.all([
        response.json(),
        simulationPromise
      ])

      setGeneratedHTML(data.result)
      setProgress(100)
      
      // Wait a bit before closing modal
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setShowProgressModal(false)
      setActiveTab("preview")
      toast.success("¡Página web generada exitosamente!")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setError(errorMessage)
      setShowProgressModal(false)
      toast.error("Error al generar la página web")
    } finally {
      setIsLoading(false)
      setIsUploadingImages(false)
    }
  }

  const modifyWebsite = async () => {
    if (!modificationPrompt.trim()) {
      toast.error("Por favor, describe qué quieres modificar")
      return
    }

    if (!generatedHTML) {
      toast.error("Primero genera una página web")
      return
    }

    setIsModifying(true)
    setError("")

    try {
      const response = await fetch("/api/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "modify_website",
          currentHTML: generatedHTML,
          modification: modificationPrompt,
        }),
      })

      if (!response.ok) {
        throw new Error("Error al modificar la página web")
      }

      const data = await response.json()
      setGeneratedHTML(data.result)
      setModificationHistory([...modificationHistory, modificationPrompt])
      setModificationPrompt("")
      setActiveTab("preview")
      toast.success("¡Página web modificada exitosamente!")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setError(errorMessage)
      toast.error("Error al modificar la página web")
    } finally {
      setIsModifying(false)
    }
  }

  const copyCode = () => {
    if (generatedHTML) {
      navigator.clipboard.writeText(generatedHTML)
      toast.success("Código copiado al portapapeles")
    }
  }

  const downloadHTML = () => {
    if (generatedHTML) {
      const blob = new Blob([generatedHTML], { type: "text/html" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "pagina-generada.html"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Archivo descargado")
    }
  }

  const openPublishModal = () => {
    if (!session?.user) {
      toast.error("Debes iniciar sesión para publicar sitios")
      router.push("/login")
      return
    }
    
    // Auto-generate a title from description
    const autoTitle = description.split('.')[0].trim().substring(0, 50) || "Mi Sitio Web"
    setPublishTitle(autoTitle)
    setPublishDescription(description.substring(0, 150))
    setPublishSubdomain("")
    setPublishedUrl("")
    setShowPublishModal(true)
  }

  const publishSite = async () => {
    if (!publishTitle.trim()) {
      toast.error("Por favor, ingresa un título para tu sitio")
      return
    }

    setIsPublishing(true)
    setError("")

    try {
      const response = await fetch("/api/sites/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          htmlContent: generatedHTML,
          title: publishTitle,
          description: publishDescription || null,
          subdomain: publishSubdomain || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al publicar el sitio")
      }

      setPublishedUrl(data.site.url)
      toast.success("¡Sitio publicado exitosamente!")
      
      // Show success state in modal for 2 seconds
      setTimeout(() => {
        setShowPublishModal(false)
        // Optionally navigate to manage sites
      }, 2000)
    } catch (err: any) {
      toast.error(err.message)
      setError(err.message)
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <ToolLayout
      title="AI Website Generator"
      description="Describe tu página web y la IA la creará por ti"
      icon={Globe}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="input" onClick={() => setActiveTab("input")}>
            <Sparkles className="h-4 w-4 mr-2" />
            Describir
          </TabsTrigger>
          <TabsTrigger value="preview" disabled={!generatedHTML} onClick={() => setActiveTab("preview")}>
            <Eye className="h-4 w-4 mr-2" />
            Vista Previa
          </TabsTrigger>
          <TabsTrigger value="code" disabled={!generatedHTML} onClick={() => setActiveTab("code")}>
            <Code2 className="h-4 w-4 mr-2" />
            Código
          </TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="space-y-4">
          {/* Wizard Progress Indicator */}
          <div className="flex items-center justify-between mb-6">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
                      wizardStep === step
                        ? 'bg-purple-600 text-white scale-110'
                        : wizardStep > step
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {wizardStep > step ? <Check className="h-5 w-5" /> : step}
                  </div>
                  <span className={`text-sm font-medium hidden sm:inline ${wizardStep >= step ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step === 1 && 'Tipo'}
                    {step === 2 && 'Estilo'}
                    {step === 3 && 'Imágenes'}
                    {step === 4 && 'Contenido'}
                  </span>
                </div>
                {step < 4 && (
                  <div className={`flex-1 h-1 mx-2 ${wizardStep > step ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Page Type */}
          {wizardStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutTemplate className="h-5 w-5 text-purple-500" />
                  Paso 1: ¿Qué tipo de página web quieres crear?
                </CardTitle>
                <CardDescription>
                  Selecciona el tipo que mejor se adapte a tu proyecto
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pageTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setPageType(type.value)}
                      className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                        pageType === type.value
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <h3 className="font-semibold text-sm mb-1">{type.label}</h3>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Visual Style */}
          {wizardStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-purple-500" />
                  Paso 2: ¿Qué estilo visual prefieres?
                </CardTitle>
                <CardDescription>
                  Elige el diseño y colores que reflejen tu marca
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {visualStyles.map((style) => (
                    <button
                      key={style.value}
                      onClick={() => setVisualStyle(style.value)}
                      className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                        visualStyle === style.value
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-sm">{style.label}</h3>
                        <div className="flex gap-1">
                          {style.colors.map((color, idx) => (
                            <div
                              key={idx}
                              className="w-4 h-4 rounded-full border border-gray-300"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{style.description}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Upload Images */}
          {wizardStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-purple-500" />
                  Paso 3: Sube tus imágenes (opcional)
                </CardTitle>
                <CardDescription>
                  Personaliza tu página con tu propio logo, fotos de productos o imágenes hero
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label htmlFor="logo-upload" className="text-sm font-medium">
                    Logo (opcional)
                  </Label>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="logo-upload"
                      className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                      <span className="text-sm">Subir Logo</span>
                    </label>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'logo')}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Hero Image Upload */}
                <div className="space-y-2">
                  <Label htmlFor="hero-upload" className="text-sm font-medium">
                    Imagen Hero (opcional)
                  </Label>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="hero-upload"
                      className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                      <span className="text-sm">Subir Imagen Hero</span>
                    </label>
                    <input
                      id="hero-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'hero')}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Product Images Upload */}
                <div className="space-y-2">
                  <Label htmlFor="product-upload" className="text-sm font-medium">
                    Imágenes de Productos (opcional)
                  </Label>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="product-upload"
                      className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                      <span className="text-sm">Subir Imagen de Producto</span>
                    </label>
                    <input
                      id="product-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'product')}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Image Previews */}
                {uploadedImages.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Imágenes subidas</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {uploadedImages.map((image) => (
                        <div key={image.id} className="relative group">
                          <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                            <img
                              src={image.preview}
                              alt={image.purpose}
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => removeImage(image.id)}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="text-xs text-center mt-1 text-muted-foreground capitalize">
                            {image.purpose}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
                  <p className="text-xs text-blue-900 dark:text-blue-100">
                    💡 <strong>Tip:</strong> Las imágenes son opcionales. Si no subes ninguna, la IA generará placeholders apropiados. Tamaño máximo: 5MB por imagen.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Content */}
          {wizardStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-500" />
                  Paso 4: Contenido clave
                </CardTitle>
                <CardDescription>
                  Define el contenido principal de tu página web
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="website-title">
                    Título principal <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="website-title"
                    placeholder="Ej: Bienvenido a Mi Negocio"
                    value={websiteTitle}
                    onChange={(e) => setWebsiteTitle(e.target.value)}
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website-description">Descripción breve</Label>
                  <Textarea
                    id="website-description"
                    placeholder="Ej: Ofrecemos soluciones innovadoras para tu negocio"
                    value={websiteDescription}
                    onChange={(e) => setWebsiteDescription(e.target.value)}
                    rows={3}
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground">{websiteDescription.length}/200 caracteres</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cta-text">Texto del botón principal (Call-to-Action)</Label>
                  <Input
                    id="cta-text"
                    placeholder="Ej: Comienza Ahora, Contáctanos, Ver Más"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    maxLength={50}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additional-info">Información adicional (opcional)</Label>
                  <Textarea
                    id="additional-info"
                    placeholder="Ej: Incluye una sección de testimonios, agrega un formulario de contacto, muestra precios en 3 columnas..."
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    rows={4}
                    maxLength={300}
                  />
                  <p className="text-xs text-muted-foreground">{additionalInfo.length}/300 caracteres</p>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-4 rounded-lg space-y-2">
                  <h4 className="text-sm font-semibold">📋 Resumen de tu página:</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li><strong>Tipo:</strong> {pageTypes.find(pt => pt.value === pageType)?.label}</li>
                    <li><strong>Estilo:</strong> {visualStyles.find(vs => vs.value === visualStyle)?.label}</li>
                    <li><strong>Imágenes:</strong> {uploadedImages.length} subidas</li>
                    <li><strong>Título:</strong> {websiteTitle || 'Sin definir'}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <Card>
            <CardContent className="pt-6">
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="flex items-center justify-between gap-3">
                <Button
                  onClick={prevStep}
                  disabled={wizardStep === 1 || isLoading}
                  variant="outline"
                  className="flex-1"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Anterior
                </Button>

                {wizardStep < 4 ? (
                  <Button
                    onClick={nextStep}
                    disabled={!canProceedToNextStep() || isLoading}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={generateWebsite}
                    disabled={isLoading || !websiteTitle.trim()}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generar Página Web
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-blue-500" />
                    Vista Previa
                  </CardTitle>
                  <CardDescription>
                    Visualización de tu página web generada
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={openPublishModal} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                    <Rocket className="h-4 w-4 mr-2" />
                    Publicar Online (Gratis 7 días)
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyCode}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadHTML}>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {generatedHTML ? (
                <div className="space-y-4">
                  <div className="border rounded-lg overflow-hidden bg-white">
                    <div className="bg-gray-100 px-4 py-2 border-b flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                      <span className="text-xs text-gray-600 ml-2">Vista Previa</span>
                      <Badge variant="secondary" className="ml-auto">
                        <Globe className="h-3 w-3 mr-1" />
                        Responsive
                      </Badge>
                    </div>
                    <iframe
                      srcDoc={generatedHTML}
                      className="w-full h-[600px] bg-white"
                      title="Vista previa de la página web"
                      sandbox="allow-scripts"
                    />
                  </div>

                  {/* Modification Panel */}
                  <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        Modificar con IA
                      </CardTitle>
                      <CardDescription>
                        Describe los cambios que quieres hacer (ejemplo: "cambia el color de fondo a azul oscuro", "agrega un formulario de contacto")
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Ejemplo: Cambia el título principal y hazlo más grande, agrega una sección de testimonios con 3 cards, cambia los colores a tonos verdes..."
                          value={modificationPrompt}
                          onChange={(e) => setModificationPrompt(e.target.value)}
                          rows={3}
                          className="resize-none bg-white"
                        />
                      </div>

                      {error && (
                        <Alert variant="destructive">
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}

                      <Button
                        onClick={modifyWebsite}
                        disabled={isModifying || !modificationPrompt.trim()}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                      >
                        {isModifying ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Modificando...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Aplicar Modificación
                          </>
                        )}
                      </Button>

                      {modificationHistory.length > 0 && (
                        <div className="bg-white p-3 rounded-lg border">
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            📝 Historial de Modificaciones
                          </h4>
                          <ul className="text-sm space-y-1">
                            {modificationHistory.map((mod, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-purple-600 font-semibold">{index + 1}.</span>
                                <span className="text-muted-foreground">{mod}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="bg-white p-3 rounded-lg border">
                        <h4 className="text-sm font-semibold mb-2">💡 Ejemplos de modificaciones:</h4>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                          <li>Cambia el color del botón principal a rojo</li>
                          <li>Agrega una sección de precios con 3 planes</li>
                          <li>Haz el texto más grande y en negrita</li>
                          <li>Agrega un footer con enlaces de redes sociales</li>
                          <li>Cambia las imágenes por placeholders de productos</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay contenido para mostrar</p>
                </div>
              )}
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
                    Código HTML
                  </CardTitle>
                  <CardDescription>
                    Código fuente de tu página web
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={openPublishModal} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                    <Rocket className="h-4 w-4 mr-2" />
                    Publicar Online
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyCode}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadHTML}>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {generatedHTML ? (
                <div className="relative">
                  <pre className="bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{generatedHTML}</code>
                  </pre>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Code2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay código para mostrar</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Progress Modal */}
      <Dialog open={showProgressModal} onOpenChange={setShowProgressModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="h-6 w-6 text-purple-600 animate-pulse" />
              Generando tu página web...
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Progreso</span>
                <span className="text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {generationSteps.map((step) => (
                <div
                  key={step.id}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                    step.status === 'completed'
                      ? 'bg-green-50 border border-green-200'
                      : step.status === 'processing'
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {step.status === 'completed' ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : step.status === 'processing' ? (
                      <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                    ) : (
                      <Clock className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-semibold ${
                      step.status === 'completed'
                        ? 'text-green-900'
                        : step.status === 'processing'
                        ? 'text-blue-900'
                        : 'text-gray-600'
                    }`}>
                      {step.title}
                    </h4>
                    <p className={`text-xs ${
                      step.status === 'completed'
                        ? 'text-green-700'
                        : step.status === 'processing'
                        ? 'text-blue-700'
                        : 'text-gray-500'
                    }`}>
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Code Preview */}
            {codePreview && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Code2 className="h-4 w-4" />
                  Vista previa del código
                </h4>
                <div className="bg-gray-950 text-green-400 p-4 rounded-lg overflow-hidden max-h-48">
                  <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                    {codePreview}
                    <span className="animate-pulse">▊</span>
                  </pre>
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
              <p className="text-xs text-purple-900">
                💡 <strong>Tip:</strong> La IA está creando una página web completamente funcional basada en tu descripción. 
                Esto puede tomar unos segundos mientras genera HTML, CSS y JavaScript optimizados.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Publish Modal */}
      <Dialog open={showPublishModal} onOpenChange={setShowPublishModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Rocket className="h-6 w-6 text-purple-600" />
              Publicar tu sitio online
            </DialogTitle>
            <DialogDescription>
              Tu sitio estará disponible gratuitamente por 7 días en una URL pública
            </DialogDescription>
          </DialogHeader>

          {!publishedUrl ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Título del sitio <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Mi Sitio Web Increíble"
                  value={publishTitle}
                  onChange={(e) => setPublishTitle(e.target.value)}
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">
                  Máximo 100 caracteres
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Descripción (opcional)</label>
                <Textarea
                  placeholder="Describe brevemente tu sitio web..."
                  value={publishDescription}
                  onChange={(e) => setPublishDescription(e.target.value)}
                  rows={3}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground">
                  Máximo 200 caracteres
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Subdominio personalizado (opcional)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="mi-sitio"
                    value={publishSubdomain}
                    onChange={(e) => {
                      const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                      setPublishSubdomain(value)
                    }}
                    maxLength={50}
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    .devtools.globalgoods.app
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Si lo dejas vacío, se generará uno automáticamente. Solo letras minúsculas, números y guiones.
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 p-4 rounded-lg space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-600" />
                  ¿Qué incluye la publicación gratuita?
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1 ml-6 list-disc">
                  <li>URL pública accesible desde cualquier lugar</li>
                  <li>7 días de hosting gratuito</li>
                  <li>Contador de visitas incluido</li>
                  <li>Opción de renovar por 7 días más</li>
                  <li>Exportación a hosting permanente cuando quieras</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-500 p-6 rounded-lg text-center space-y-3">
                <Check className="h-12 w-12 text-green-600 mx-auto" />
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                  ¡Sitio publicado exitosamente!
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Tu sitio ya está online y accesible públicamente
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">URL de tu sitio:</label>
                <div className="flex gap-2">
                  <Input value={publishedUrl} readOnly className="font-mono text-sm" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(publishedUrl)
                      toast.success("URL copiada")
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <a href={publishedUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver Sitio
                  </Button>
                </a>
                <Link href="/sites/manage" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Gestionar Sitios
                  </Button>
                </Link>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
                <p className="text-xs text-blue-900 dark:text-blue-100">
                  💡 Tu sitio expirará en 7 días. Puedes renovarlo gratuitamente o exportarlo a un hosting permanente desde el panel de gestión.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            {!publishedUrl ? (
              <>
                <Button variant="outline" onClick={() => setShowPublishModal(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={publishSite}
                  disabled={isPublishing || !publishTitle.trim()}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Publicando...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4 mr-2" />
                      Publicar Ahora
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={() => setShowPublishModal(false)} className="w-full">
                Cerrar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ToolLayout>
  )
}
