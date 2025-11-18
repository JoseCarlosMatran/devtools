
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const siteId = params.id;

    // Buscar el sitio
    const site = await prisma.publishedSite.findUnique({
      where: { id: siteId },
    });

    if (!site) {
      return NextResponse.json(
        { error: 'Sitio no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el sitio pertenezca al usuario
    if (site.userId !== user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para renovar este sitio' },
        { status: 403 }
      );
    }

    // Calcular nueva fecha de expiración (7 días desde ahora o desde la fecha actual de expiración)
    const now = new Date();
    const currentExpiry = site.expiresAt;
    const baseDate = currentExpiry > now ? currentExpiry : now;
    const newExpiresAt = new Date(baseDate);
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    // Actualizar el sitio
    const updatedSite = await prisma.publishedSite.update({
      where: { id: siteId },
      data: {
        expiresAt: newExpiresAt,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      site: {
        id: updatedSite.id,
        expiresAt: updatedSite.expiresAt,
        daysRemaining: Math.ceil(
          (updatedSite.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      },
    });
  } catch (error) {
    console.error('Error renovando sitio:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
