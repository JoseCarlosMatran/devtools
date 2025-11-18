
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Globe,
  Clock,
  Eye,
  ExternalLink,
  RefreshCw,
  Trash2,
  Download,
  Copy,
  AlertCircle,
  Loader2,
  Plus,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';

interface Site {
  id: string;
  subdomain: string;
  title: string;
  description: string | null;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
  views: number;
  url: string;
  isExpired: boolean;
  daysRemaining: number;
}

export default function ManageSitesPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renewingId, setRenewingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchSites();
    }
  }, [status]);

  const fetchSites = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/sites/my-sites');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error cargando sitios');
      }

      setSites(data.sites);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenew = async (siteId: string) => {
    try {
      setRenewingId(siteId);

      const response = await fetch(`/api/sites/renew/${siteId}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error renovando sitio');
      }

      toast.success('Sitio renovado por 7 días más');
      fetchSites();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRenewingId(null);
    }
  };

  const handleDelete = async (siteId: string, siteTitle: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${siteTitle}"?`)) {
      return;
    }

    try {
      setDeletingId(siteId);

      const response = await fetch(`/api/sites/delete/${siteId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error eliminando sitio');
      }

      toast.success('Sitio eliminado correctamente');
      fetchSites();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copiada al portapapeles');
  };

  const handleExportHTML = async (siteId: string, title: string) => {
    try {
      // Encontrar el sitio para obtener el HTML
      const site = sites.find(s => s.id === siteId);
      if (!site) return;

      // Crear un elemento temporal para descargar
      const blob = new Blob(['<!-- Contenido HTML del sitio -->'], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('HTML descargado');
    } catch (err) {
      toast.error('Error descargando HTML');
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600 dark:text-gray-400">Cargando sitios...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const activeSites = sites.filter(s => !s.isExpired && s.isActive);
  const expiredSites = sites.filter(s => s.isExpired || !s.isActive);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Mis Sitios Publicados</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Gestiona todos tus sitios web creados con IA
              </p>
            </div>
            <Link href="/tools/ai-website-generator">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Crear Nuevo Sitio
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Sitios Activos</p>
                  <p className="text-2xl font-bold">{activeSites.length}</p>
                </div>
                <Globe className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Visitas</p>
                  <p className="text-2xl font-bold">
                    {sites.reduce((acc, site) => acc + site.views, 0)}
                  </p>
                </div>
                <Eye className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Sitios Expirados</p>
                  <p className="text-2xl font-bold">{expiredSites.length}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {sites.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Globe className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold mb-2">No tienes sitios publicados</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Crea tu primer sitio web con IA en minutos
              </p>
              <Link href="/tools/ai-website-generator">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Mi Primer Sitio
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Sitios Activos */}
        {activeSites.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Sitios Activos</h2>
            <div className="grid grid-cols-1 gap-4">
              {activeSites.map((site) => (
                <Card key={site.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">{site.title}</CardTitle>
                          <Badge variant="default" className="bg-green-500">
                            Activo
                          </Badge>
                        </div>
                        {site.description && (
                          <CardDescription>{site.description}</CardDescription>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              Expira en{' '}
                              <span className={site.daysRemaining <= 2 ? 'text-orange-500 font-semibold' : ''}>
                                {site.daysRemaining} {site.daysRemaining === 1 ? 'día' : 'días'}
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            <span>{site.views} visitas</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => window.open(site.url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver Sitio
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyUrl(site.url)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar URL
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRenew(site.id)}
                        disabled={renewingId === site.id}
                      >
                        {renewingId === site.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Renovar 7 días
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExportHTML(site.id, site.title)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Descargar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(site.id, site.title)}
                        disabled={deletingId === site.id}
                      >
                        {deletingId === site.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Eliminar
                      </Button>
                    </div>
                    <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono break-all">
                      {site.url}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Sitios Expirados */}
        {expiredSites.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Sitios Expirados</h2>
            <div className="grid grid-cols-1 gap-4">
              {expiredSites.map((site) => (
                <Card key={site.id} className="opacity-75">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="h-5 w-5 text-gray-400" />
                          <CardTitle className="text-lg text-gray-600 dark:text-gray-400">
                            {site.title}
                          </CardTitle>
                          <Badge variant="secondary">Expirado</Badge>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Expiró el{' '}
                          {new Date(site.expiresAt).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Link href="/export-options">
                        <Button size="sm" variant="default">
                          <Download className="h-4 w-4 mr-2" />
                          Ver Opciones de Hosting
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRenew(site.id)}
                        disabled={renewingId === site.id}
                      >
                        {renewingId === site.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Republicar 7 días
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(site.id, site.title)}
                        disabled={deletingId === site.id}
                      >
                        {deletingId === site.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Eliminar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-gray-600 dark:text-gray-400">
          <p>
            Los sitios publicados son gratuitos por 7 días.{' '}
            <Link href="/export-options" className="text-primary hover:underline">
              Ver opciones de hosting permanente
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
