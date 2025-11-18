
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
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

    // Obtener todos los sitios del usuario
    const sites = await prisma.publishedSite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        subdomain: true,
        title: true,
        description: true,
        createdAt: true,
        expiresAt: true,
        isActive: true,
        views: true,
      },
    });

    // Agregar información adicional a cada sitio
    const now = new Date();
    const sitesWithStatus = sites.map((site: typeof sites[0]) => {
      const isExpired = now > site.expiresAt;
      const daysRemaining = Math.ceil(
        (site.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        ...site,
        url: `https://devtoolsplatform.abacusai.app/sites/${site.subdomain}`,
        isExpired,
        daysRemaining: isExpired ? 0 : daysRemaining,
      };
    });

    return NextResponse.json({
      success: true,
      sites: sitesWithStatus,
    });
  } catch (error) {
    console.error('Error obteniendo sitios:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
