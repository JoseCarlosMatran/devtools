
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PageProps {
  params: {
    subdomain: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const site = await prisma.publishedSite.findUnique({
    where: { subdomain: params.subdomain },
  });

  if (!site) {
    return {
      title: 'Sitio no encontrado',
      description: 'El sitio que buscas no existe.',
    };
  }

  const now = new Date();
  const isExpired = now > site.expiresAt;

  if (isExpired || !site.isActive) {
    return {
      title: 'Sitio Expirado',
      description: 'Este sitio ha expirado.',
    };
  }

  return {
    title: site.title,
    description: site.description || `${site.title} - Creado con DevTools Platform`,
  };
}

export default async function PublishedSitePage({ params }: PageProps) {
  const site = await prisma.publishedSite.findUnique({
    where: { subdomain: params.subdomain },
  });

  if (!site) {
    notFound();
  }

  const now = new Date();
  const isExpired = now > site.expiresAt;
  const daysRemaining = Math.ceil(
    (site.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Incrementar el contador de visitas
  if (!isExpired && site.isActive) {
    await prisma.publishedSite.update({
      where: { id: site.id },
      data: { views: { increment: 1 } },
    });
  }

  // Si el sitio ha expirado o está inactivo
  if (isExpired || !site.isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <Alert variant="destructive" className="border-red-200 dark:border-red-800">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription className="text-base">
              <h3 className="font-semibold mb-2">Sitio Expirado</h3>
              <p className="text-sm mb-3">
                Este sitio publicado ha expirado. Los sitios demo están disponibles gratuitamente durante 7 días.
              </p>
              {site.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  <strong>Título:</strong> {site.title}
                </p>
              )}
              <p className="text-xs text-gray-500">
                Expiró el: {site.expiresAt.toLocaleDateString('es-ES', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </AlertDescription>
          </Alert>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg space-y-4">
            <h4 className="font-semibold text-lg">¿Quieres publicar tu sitio permanentemente?</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Descarga el código y publícalo en tu servicio de hosting favorito:
            </p>
            <Link href="/export-options">
              <Button className="w-full">
                Ver Opciones de Hosting
              </Button>
            </Link>
            <Link href="/tools/ai-website-generator">
              <Button variant="outline" className="w-full">
                Crear Nuevo Sitio
              </Button>
            </Link>
          </div>

          <div className="text-center text-sm text-gray-500">
            Powered by{' '}
            <Link href="/" className="font-semibold hover:underline">
              GlobalGoods Up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Agregar el footer "Powered by GlobalGoods Up" al HTML
  const htmlWithFooter = site.htmlContent.replace(
    '</body>',
    `
    <style>
      .globalgoods-footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        color: white;
        padding: 0.5rem 1rem;
        text-align: center;
        font-size: 0.875rem;
        z-index: 9999;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }
      .globalgoods-footer a {
        color: #60a5fa;
        text-decoration: none;
        font-weight: 600;
        transition: color 0.2s;
      }
      .globalgoods-footer a:hover {
        color: #93c5fd;
        text-decoration: underline;
      }
      .globalgoods-banner {
        background: linear-gradient(90deg, #fbbf24, #f59e0b);
        color: #1f2937;
        padding: 0.75rem 1rem;
        text-align: center;
        font-size: 0.875rem;
        font-weight: 500;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
      }
      body {
        padding-bottom: 100px !important;
      }
    </style>
    <div class="globalgoods-banner">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
      Este sitio expira en ${daysRemaining} ${daysRemaining === 1 ? 'día' : 'días'}. 
      <a href="https://devtoolsplatform.abacusai.app/export-options" target="_blank" style="color: #1f2937; text-decoration: underline; font-weight: 600; margin-left: 0.25rem;">Ver opciones de hosting permanente →</a>
    </div>
    <div class="globalgoods-footer">
      Creado con ❤️ usando <a href="https://devtoolsplatform.abacusai.app" target="_blank">DevTools Platform</a> | Powered by <strong>GlobalGoods Up</strong>
    </div>
    </body>`
  );

  return (
    <div className="w-full h-screen">
      <iframe
        srcDoc={htmlWithFooter}
        className="w-full h-full border-0"
        title={site.title}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
      />
    </div>
  );
}
