
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function DELETE(
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
        { error: 'No tienes permiso para eliminar este sitio' },
        { status: 403 }
      );
    }

    // Eliminar el sitio
    await prisma.publishedSite.delete({
      where: { id: siteId },
    });

    return NextResponse.json({
      success: true,
      message: 'Sitio eliminado correctamente',
    });
  } catch (error) {
    console.error('Error eliminando sitio:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
