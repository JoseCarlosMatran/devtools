"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  Code2, 
  Send, 
  Search, 
  Key, 
  FileCode, 
  Hash, 
  GitCompare, 
  Palette,
  Sparkles,
  Database,
  FileText,
  QrCode,
  Link2,
  Clock,
  Fingerprint,
  Calendar,
  LogIn,
  UserPlus,
  Check,
  Crown,
  Globe,
  Eye,
  GitBranch
} from "lucide-react";

const tools = [
  {
    id: "json-formatter",
    title: "JSON Formatter",
    description: "Formatea, valida y minifica JSON con detección de errores",
    icon: Code2,
    badge: "Popular",
    href: "/tools/json-formatter"
  },
  {
    id: "api-tester",
    title: "API Tester",
    description: "Prueba APIs REST con headers personalizados y análisis detallado",
    icon: Send,
    badge: "Esencial",
    href: "/tools/api-tester"
  },
  {
    id: "regex-tester",
    title: "Regex Tester",
    description: "Prueba expresiones regulares con matching en tiempo real",
    icon: Search,
    badge: "Avanzado",
    href: "/tools/regex-tester"
  },
  {
    id: "jwt-decoder",
    title: "JWT Decoder",
    description: "Decodifica y analiza JSON Web Tokens",
    icon: Key,
    badge: "Seguridad",
    href: "/tools/jwt-decoder"
  },
  {
    id: "base64",
    title: "Base64 Encoder/Decoder",
    description: "Codifica y decodifica strings en Base64",
    icon: FileCode,
    badge: "Básico",
    href: "/tools/base64"
  },
  {
    id: "hash-generator",
    title: "Hash Generator",
    description: "Genera hashes MD5, SHA-1, SHA-256, SHA-512",
    icon: Hash,
    badge: "Seguridad",
    href: "/tools/hash-generator"
  },
  {
    id: "diff-checker",
    title: "Diff Checker",
    description: "Compara dos textos y visualiza las diferencias",
    icon: GitCompare,
    badge: "Útil",
    href: "/tools/diff-checker"
  },
  {
    id: "color-picker",
    title: "Color Picker",
    description: "Selector de colores con conversión entre formatos",
    icon: Palette,
    badge: "Diseño",
    href: "/tools/color-picker"
  },
  {
    id: "sql-formatter",
    title: "SQL Formatter",
    description: "Formatea y embellece queries SQL",
    icon: Database,
    badge: "DB",
    href: "/tools/sql-formatter"
  },
  {
    id: "markdown-editor",
    title: "Markdown Editor",
    description: "Editor y previsualizador de Markdown en tiempo real",
    icon: FileText,
    badge: "Editor",
    href: "/tools/markdown-editor"
  },
  {
    id: "qr-generator",
    title: "QR Code Generator",
    description: "Genera códigos QR personalizados",
    icon: QrCode,
    badge: "Nuevo",
    href: "/tools/qr-generator"
  },
  {
    id: "url-encoder",
    title: "URL Encoder/Decoder",
    description: "Codifica y decodifica URLs",
    icon: Link2,
    badge: "Web",
    href: "/tools/url-encoder"
  },
  {
    id: "timestamp-converter",
    title: "Timestamp Converter",
    description: "Convierte entre Unix timestamp y fechas",
    icon: Clock,
    badge: "Tiempo",
    href: "/tools/timestamp-converter"
  },
  {
    id: "uuid-generator",
    title: "UUID Generator",
    description: "Genera identificadores únicos UUID v4",
    icon: Fingerprint,
    badge: "ID",
    href: "/tools/uuid-generator"
  },
  {
    id: "cron-generator",
    title: "Cron Generator",
    description: "Genera y valida expresiones cron",
    icon: Calendar,
    badge: "Automatización",
    href: "/tools/cron-generator"
  },
  {
    id: "ai-website-generator",
    title: "AI Website Generator",
    description: "Crea páginas web completas con IA a partir de descripciones",
    icon: Globe,
    badge: "IA",
    href: "/tools/ai-website-generator"
  },
  {
    id: "workflow-generator",
    title: "Workflow Code Generator",
    description: "Genera código para automatizaciones en n8n, Make, Node-RED y Zapier",
    icon: GitBranch,
    badge: "Nuevo",
    href: "/tools/workflow-generator"
  },
];

export default function HomePage() {
  const { data: session, status } = useSession() || {};
  const isSubscribed = session?.user?.subscription?.status === "active";

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Code2 className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold">DevTools Platform</h1>
                <p className="text-xs text-muted-foreground">17 herramientas profesionales</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              {status === "loading" ? (
                <div className="h-9 w-24 bg-muted animate-pulse rounded-md" />
              ) : session ? (
                <div className="flex items-center gap-3">
                  {isSubscribed && (
                    <Badge variant="default" className="hidden sm:flex">
                      <Crown className="h-3 w-3 mr-1" />
                      Pro
                    </Badge>
                  )}
                  <Link href="/dashboard">
                    <Button variant="outline" size="sm">
                      Dashboard
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login">
                    <Button variant="ghost" size="sm">
                      <LogIn className="h-4 w-4 mr-2" />
                      Login
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Registrarse
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            <span>16 Herramientas Profesionales</span>
          </div>
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            Herramientas para
            <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent"> Desarrolladores</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            La plataforma más completa con 17 herramientas esenciales.
            Prueba gratis o suscríbete para acceso ilimitado.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={session ? "/dashboard" : "/signup"}>
              <Button size="lg" className="w-full sm:w-auto">
                {session ? "Ir a Dashboard" : "Comenzar Gratis"}
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Ver Planes
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* AI Website Generator - Featured Tool */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <Link href="/tools/ai-website-generator">
            <Card className="border-2 border-primary/50 hover:border-primary transition-all duration-300 hover:shadow-2xl cursor-pointer group overflow-hidden relative">
              {/* Background gradient effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <CardHeader className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Nuevo con IA
                  </Badge>
                  <Badge variant="secondary">
                    <Globe className="h-3 w-3 mr-1" />
                    Generador
                  </Badge>
                </div>
                
                <div className="flex items-start gap-6">
                  <div className="p-4 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                    <Globe className="h-12 w-12 text-primary" />
                  </div>
                  
                  <div className="flex-1">
                    <CardTitle className="text-3xl mb-3 group-hover:text-primary transition-colors">
                      AI Website Generator
                    </CardTitle>
                    <CardDescription className="text-base">
                      🎨 Crea páginas web completas solo con una descripción. La IA genera el código HTML, CSS y JavaScript listo para usar.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="relative">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                    <Sparkles className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-1 text-sm">Generación Inteligente</h4>
                      <p className="text-xs text-muted-foreground">Describe tu idea y la IA crea el código</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                    <Eye className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-1 text-sm">Vista Previa en Tiempo Real</h4>
                      <p className="text-xs text-muted-foreground">Ve tu página mientras se genera</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                    <Code2 className="h-5 w-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-1 text-sm">Código Completo</h4>
                      <p className="text-xs text-muted-foreground">HTML, CSS y JS listos para descargar</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium">
                      <Sparkles className="h-3 w-3" />
                      Potenciado por IA
                    </span>
                  </p>
                  <Button size="lg" className="group-hover:scale-105 transition-transform">
                    Crear Página Web
                    <Globe className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      {/* Pricing Highlight */}
      {!isSubscribed && (
        <section className="py-12 px-4 bg-muted/50">
          <div className="container mx-auto max-w-5xl">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="text-center">
                <CardHeader>
                  <CardTitle>Demo Gratis</CardTitle>
                  <CardDescription>Prueba cada herramienta</CardDescription>
                  <p className="text-3xl font-bold mt-4">$0</p>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-center">
                      <Check className="h-4 w-4 mr-2 text-primary" />
                      1 uso por herramienta
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 mr-2 text-primary" />
                      Sin registro
                    </li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="text-center border-primary shadow-lg">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge>Más Popular</Badge>
                </div>
                <CardHeader>
                  <CardTitle>Mensual</CardTitle>
                  <CardDescription>Acceso ilimitado</CardDescription>
                  <p className="text-3xl font-bold mt-4">$9.99<span className="text-sm font-normal">/mes</span></p>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-center">
                      <Check className="h-4 w-4 mr-2 text-primary" />
                      Uso ilimitado
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 mr-2 text-primary" />
                      Historial guardado
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 mr-2 text-primary" />
                      Soporte prioritario
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <CardTitle>Anual</CardTitle>
                  <CardDescription>Ahorra $12 al año</CardDescription>
                  <p className="text-3xl font-bold mt-4">$108<span className="text-sm font-normal">/año</span></p>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-center">
                      <Check className="h-4 w-4 mr-2 text-primary" />
                      Todo del plan mensual
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 mr-2 text-primary" />
                      12 meses x 11
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 mr-2 text-primary" />
                      Acceso anticipado
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}

      {/* Tools Grid */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <h3 className="text-3xl font-bold text-center mb-12">
            Todas las Herramientas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.filter(tool => tool.id !== 'ai-website-generator').map((tool) => {
              const Icon = tool.icon;
              return (
                <Link key={tool.id} href={tool.href}>
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <Badge variant="secondary">{tool.badge}</Badge>
                      </div>
                      <CardTitle className="text-lg mt-4">{tool.title}</CardTitle>
                      <CardDescription>{tool.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!session && (
        <section className="py-16 px-4 bg-gradient-to-r from-primary/10 to-blue-600/10">
          <div className="container mx-auto max-w-4xl text-center">
            <h3 className="text-3xl font-bold mb-4">
              ¿Listo para empezar?
            </h3>
            <p className="text-xl text-muted-foreground mb-8">
              Únete a miles de desarrolladores que ya usan nuestras herramientas
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Crear Cuenta Gratis
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Ver Todos los Planes
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t py-8 px-4 mt-16">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <Code2 className="h-6 w-6 text-primary" />
              <span className="font-semibold">DevTools Platform</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              © 2024 DevTools Platform. Todas las herramientas profesionales para desarrolladores.
            </p>
            <p className="text-sm text-muted-foreground">
              Powered by <span className="font-semibold text-foreground">GlobalGoods Up</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
