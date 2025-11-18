"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Code2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function PricingPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (plan: "monthly" | "annual") => {
    if (status === "unauthenticated") {
      router.push("/signup");
      return;
    }

    setLoading(plan);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Error al crear sesión de pago");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      toast.error("Error al procesar el pago");
    } finally {
      setLoading(null);
    }
  };

  const plans = [
    {
      name: "Demo",
      price: 0,
      period: "Gratis",
      description: "Prueba cada herramienta una vez",
      features: [
        "Acceso a 17 herramientas",
        "1 uso por herramienta",
        "Sin registro requerido",
        "Ideal para probar la plataforma",
      ],
      cta: "Probar Ahora",
      onClick: () => router.push("/"),
      popular: false,
    },
    {
      name: "Mensual",
      price: 9.99,
      period: "mes",
      description: "Acceso ilimitado sin compromisos",
      features: [
        "Acceso ilimitado a 17 herramientas",
        "Historial guardado",
        "Sin límites de uso",
        "Cancela cuando quieras",
        "Soporte prioritario",
      ],
      cta: "Suscribirse",
      onClick: () => handleSubscribe("monthly"),
      popular: false,
    },
    {
      name: "Anual",
      price: 108,
      period: "año",
      description: "Ahorra $12 - 12 meses por el precio de 11",
      features: [
        "Todo lo del plan mensual",
        "Ahorra $12 al año",
        "12 meses por el precio de 11",
        "Facturación anual",
        "Soporte premium",
        "Acceso anticipado a nuevas herramientas",
      ],
      cta: "Suscribirse",
      onClick: () => handleSubscribe("annual"),
      popular: true,
    },
  ];

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

        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <Code2 className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">
            Elige el Plan Perfecto para Ti
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Accede a 17 herramientas profesionales para desarrolladores.
            Comienza con el demo gratuito o suscríbete para uso ilimitado.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${
                plan.popular
                  ? "border-primary shadow-lg scale-105"
                  : ""
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Más Popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">
                    ${plan.price}
                  </span>
                  {plan.period !== "Gratis" && (
                    <span className="text-muted-foreground ml-2">
                      / {plan.period}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  size="lg"
                  variant={plan.popular ? "default" : "outline"}
                  onClick={plan.onClick}
                  disabled={loading !== null}
                >
                  {loading === plan.name.toLowerCase()
                    ? "Procesando..."
                    : plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">
            ¿Tienes preguntas sobre los planes?
          </p>
          <p className="text-sm text-muted-foreground">
            Todos los planes incluyen acceso completo a nuestras 17 herramientas profesionales.
            Puedes cancelar tu suscripción en cualquier momento.
          </p>
        </div>
      </div>
    </div>
  );
}
