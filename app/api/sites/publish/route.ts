
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface PublishRequest {
  htmlContent: string;
  title: string;
  description?: string;
  subdomain?: string;
}

function generateUniqueSubdomain(title: string): string {
  // Limpiar el título y crear un slug
  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);
  
  // Agregar sufijo único
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  
  return `${slug}-${timestamp}${random}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autenticado. Por favor inicia sesión.' },
        { status: 401 }
      );
    }

    // Buscar el usuario
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const body: PublishRequest = await req.json();
    const { htmlContent, title, description, subdomain: requestedSubdomain } = body;

    if (!htmlContent || !title) {
      return NextResponse.json(
        { error: 'Se requiere contenido HTML y título' },
        { status: 400 }
      );
    }

    // Generar o validar subdomain
    let subdomain = requestedSubdomain;
    if (subdomain) {
      // Validar formato del subdomain
      const subdomainRegex = /^[a-z0-9-]+$/;
      if (!subdomainRegex.test(subdomain)) {
        return NextResponse.json(
          { error: 'El subdominio solo puede contener letras minúsculas, números y guiones' },
          { status: 400 }
        );
      }

      // Verificar si ya existe
      const existing = await prisma.publishedSite.findUnique({
        where: { subdomain },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Este subdominio ya está en uso' },
          { status: 409 }
        );
      }
    } else {
      subdomain = generateUniqueSubdomain(title);
    }

    // Calcular fecha de expiración (7 días)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Crear el sitio publicado
    const publishedSite = await prisma.publishedSite.create({
      data: {
        userId: user.id,
        subdomain,
        htmlContent,
        title,
        description: description || null,
        expiresAt,
        isActive: true,
        views: 0,
      },
    });

    // Construir la URL del sitio
    const siteUrl = `https://devtoolsplatform.abacusai.app/sites/${subdomain}`;

    return NextResponse.json({
      success: true,
      site: {
        id: publishedSite.id,
        subdomain: publishedSite.subdomain,
        url: siteUrl,
        title: publishedSite.title,
        expiresAt: publishedSite.expiresAt,
        createdAt: publishedSite.createdAt,
      },
    });
  } catch (error) {
    console.error('Error publicando sitio:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
