"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code2, CreditCard, LogOut, Settings, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function DashboardPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Error al abrir el portal");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      toast.error("Error al abrir el portal de suscripción");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirect: true, callbackUrl: "/" });
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Code2 className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const isSubscribed = session.user.subscription?.status === "active";
  const subscriptionPlan = session.user.subscription?.plan;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al inicio
            </Button>
          </Link>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Code2 className="h-12 w-12 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Mi Dashboard</h1>
                <p className="text-muted-foreground">
                  Bienvenido, {session.user.name || session.user.email}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>

          <div className="grid gap-6">
            {/* Subscription Status Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Estado de Suscripción</CardTitle>
                    <CardDescription>
                      Información sobre tu plan actual
                    </CardDescription>
                  </div>
                  {isSubscribed ? (
                    <Badge className="bg-green-500">Activo</Badge>
                  ) : (
                    <Badge variant="secondary">Sin suscripción</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isSubscribed ? (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Plan Actual
                      </p>
                      <p className="text-lg font-semibold capitalize">
                        {subscriptionPlan === "monthly"
                          ? "Mensual - $9.99/mes"
                          : "Anual - $108/año"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Beneficios
                      </p>
                      <ul className="text-sm space-y-1">
                        <li>✓ Acceso ilimitado a 17 herramientas</li>
                        <li>✓ Historial guardado</li>
                        <li>✓ Sin límites de uso</li>
                        <li>✓ Soporte prioritario</li>
                      </ul>
                    </div>
                    <Button
                      onClick={handleManageSubscription}
                      disabled={loading}
                      className="w-full"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      {loading
                        ? "Abriendo..."
                        : "Gestionar Suscripción"}
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Actualmente no tienes una suscripción activa. Suscríbete
                      para acceder a todas las herramientas sin límites.
                    </p>
                    <Link href="/pricing">
                      <Button className="w-full">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Ver Planes
                      </Button>
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Tools Access Card */}
            <Card>
              <CardHeader>
                <CardTitle>Herramientas Disponibles</CardTitle>
                <CardDescription>
                  {isSubscribed
                    ? "Tienes acceso ilimitado a todas las herramientas"
                    : "Prueba cada herramienta una vez de forma gratuita"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    "JSON Formatter",
                    "API Tester",
                    "Regex Tester",
                    "JWT Decoder",
                    "Base64 Encoder",
                    "Hash Generator",
                    "Diff Checker",
                    "Color Picker",
                    "SQL Formatter",
                    "Markdown Editor",
                    "QR Generator",
                    "URL Encoder",
                    "Timestamp Converter",
                    "UUID Generator",
                    "Cron Generator",
                  ].map((tool) => (
                    <div
                      key={tool}
                      className="p-3 border rounded-lg text-sm text-center"
                    >
                      {tool}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/">
                  <Button variant="outline" className="w-full justify-start">
                    <Code2 className="h-4 w-4 mr-2" />
                    Ir a Herramientas
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="outline" className="w-full justify-start">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Ver Planes y Precios
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
