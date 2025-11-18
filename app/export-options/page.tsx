
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ExternalLink,
  CheckCircle,
  DollarSign,
  Zap,
  Globe,
  Server,
  Rocket,
  FileCode,
} from 'lucide-react';

export default function ExportOptionsPage() {
  const hostingOptions = [
    {
      name: 'Netlify',
      icon: Rocket,
      price: 'Gratis',
      priceDetail: 'Plan gratuito con funciones básicas',
      description: 'Deploy automático desde Git, ideal para sitios estáticos',
      features: [
        'Deploy automático desde GitHub',
        'HTTPS gratis',
        'CDN global',
        'Formularios incluidos',
      ],
      difficulty: 'Fácil',
      steps: [
        'Crea una cuenta en Netlify.com',
        'Conecta tu repositorio de GitHub (o sube el archivo HTML)',
        'Configura el dominio personalizado (opcional)',
        'Deploy automático en segundos',
      ],
      url: 'https://www.netlify.com',
      recommended: true,
      color: 'bg-teal-500',
    },
    {
      name: 'Vercel',
      icon: Zap,
      price: 'Gratis',
      priceDetail: 'Plan hobby gratuito',
      description: 'Hosting optimizado para Next.js y sitios estáticos',
      features: [
        'Deploy ultra rápido',
        'Preview deployments',
        'Analytics incluido',
        'SSL automático',
      ],
      difficulty: 'Fácil',
      steps: [
        'Regístrate en Vercel.com',
        'Importa tu proyecto desde GitHub',
        'Configura variables de entorno (si las necesitas)',
        'Deploy con un click',
      ],
      url: 'https://vercel.com',
      recommended: true,
      color: 'bg-black',
    },
    {
      name: 'Ionos',
      icon: Server,
      price: '€1/mes',
      priceDetail: 'Primer año, luego €8/mes',
      description: 'Hosting tradicional con dominio incluido',
      features: [
        'Dominio gratis el primer año',
        'Email incluido',
        'FTP access',
        'Soporte 24/7',
      ],
      difficulty: 'Medio',
      steps: [
        'Crea una cuenta en Ionos.es',
        'Elige el plan de hosting web',
        'Sube tu HTML via FTP o File Manager',
        'Configura tu dominio',
      ],
      url: 'https://www.ionos.es',
      recommended: false,
      color: 'bg-blue-600',
    },
    {
      name: 'Hostinger',
      icon: Globe,
      price: '€1.99/mes',
      priceDetail: 'Con contrato de 48 meses',
      description: 'Hosting económico con buena velocidad',
      features: [
        'Dominio gratis',
        '100 GB de almacenamiento',
        'Email profesional',
        'WordPress fácil',
      ],
      difficulty: 'Medio',
      steps: [
        'Regístrate en Hostinger.es',
        'Selecciona el plan Premium',
        'Usa el File Manager para subir tu HTML',
        'Apunta tu dominio a Hostinger',
      ],
      url: 'https://www.hostinger.es',
      recommended: false,
      color: 'bg-purple-600',
    },
    {
      name: 'GitHub Pages',
      icon: FileCode,
      price: 'Gratis',
      priceDetail: '100% gratuito para repositorios públicos',
      description: 'Hosting directo desde GitHub, perfecto para devs',
      features: [
        'Hosting gratuito ilimitado',
        'Jekyll integrado',
        'Dominio personalizado',
        'HTTPS automático',
      ],
      difficulty: 'Medio',
      steps: [
        'Crea un repositorio en GitHub',
        'Sube tu HTML al repo',
        'Ve a Settings > Pages',
        'Activa GitHub Pages desde la rama main',
      ],
      url: 'https://pages.github.com',
      recommended: false,
      color: 'bg-gray-800',
    },
    {
      name: 'WordPress.com',
      icon: Server,
      price: 'Gratis / €4/mes',
      priceDetail: 'Plan gratuito con subdomain, premium con dominio',
      description: 'Plataforma todo en uno para blogs y sitios',
      features: [
        'Editor visual',
        'Temas profesionales',
        'Plugins disponibles',
        'Soporte multilenguaje',
      ],
      difficulty: 'Fácil',
      steps: [
        'Crea una cuenta en WordPress.com',
        'Crea un nuevo sitio',
        'Usa el Custom HTML block para tu código',
        'Personaliza con temas y plugins',
      ],
      url: 'https://wordpress.com',
      recommended: false,
      color: 'bg-blue-700',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/sites/manage">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Mis Sitios
            </Button>
          </Link>
          <h1 className="text-4xl font-bold mb-3">Opciones de Hosting Permanente</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Publica tu sitio de forma permanente en uno de estos servicios de hosting
          </p>
        </div>

        {/* Guía de Exportación */}
        <Card className="mb-8 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              Cómo exportar tu sitio
            </CardTitle>
            <CardDescription>
              Sigue estos pasos para preparar tu sitio para hosting permanente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Paso 1: Descarga tu código
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Ve a tu sitio en el panel de gestión y haz click en "Descargar HTML". Esto
                  descargará un archivo con todo el código necesario.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Paso 2: Elige un servicio
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Selecciona uno de los servicios de hosting a continuación según tu presupuesto
                  y necesidades técnicas.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Paso 3: Sube tu código
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Sigue las instrucciones específicas de cada servicio para subir tu archivo
                  HTML. La mayoría ofrecen interfaces visuales muy fáciles.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Paso 4: Configura tu dominio
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Conecta tu dominio personalizado o usa el subdomain gratuito que te proporciona
                  el servicio.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Opciones de Hosting */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hostingOptions.map((option) => {
            const IconComponent = option.icon;
            return (
              <Card
                key={option.name}
                className={`relative hover:shadow-lg transition-all ${
                  option.recommended ? 'border-primary border-2' : ''
                }`}
              >
                {option.recommended && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-white">Recomendado</Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`p-3 rounded-lg ${option.color} text-white inline-flex`}
                    >
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{option.price}</div>
                      <div className="text-xs text-gray-500">{option.priceDetail}</div>
                    </div>
                  </div>
                  <CardTitle>{option.name}</CardTitle>
                  <CardDescription>{option.description}</CardDescription>
                  <Badge variant="outline" className="w-fit mt-2">
                    Dificultad: {option.difficulty}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Características:</h4>
                      <ul className="space-y-1">
                        {option.features.map((feature, index) => (
                          <li
                            key={index}
                            className="text-sm flex items-start gap-2 text-gray-600 dark:text-gray-400"
                          >
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm mb-2">Pasos a seguir:</h4>
                      <ol className="space-y-1">
                        {option.steps.map((step, index) => (
                          <li
                            key={index}
                            className="text-sm text-gray-600 dark:text-gray-400"
                          >
                            {index + 1}. {step}
                          </li>
                        ))}
                      </ol>
                    </div>

                    <a href={option.url} target="_blank" rel="noopener noreferrer">
                      <Button className="w-full" variant={option.recommended ? 'default' : 'outline'}>
                        Ir a {option.name}
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer Help */}
        <Card className="mt-8 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">¿Necesitas ayuda?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Si tienes problemas para publicar tu sitio, puedes contactarnos o consultar las
              guías detalladas de cada servicio.
            </p>
            <div className="flex gap-3">
              <Link href="/tools/ai-website-generator">
                <Button variant="outline">
                  Crear Nuevo Sitio
                </Button>
              </Link>
              <Link href="/sites/manage">
                <Button variant="default">
                  Ver Mis Sitios
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-600 dark:text-gray-400">
          <p>
            Powered by{' '}
            <Link href="/" className="font-semibold hover:underline">
              GlobalGoods Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
