"use client";

import { useState } from "react";
import * as CronParser from "cron-parser";
import { ToolLayout } from "@/components/tool-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/copy-button";
import { AIAssistant } from "@/components/ai-assistant";
import { Clock, Trash2, Wand2, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function CronGeneratorPage() {
  const [cronExpression, setCronExpression] = useState("* * * * *");
  const [description, setDescription] = useState("");
  const [nextRuns, setNextRuns] = useState<string[]>([]);

  const handleParse = () => {
    try {
      const interval = (CronParser as any).parseExpression(cronExpression);
      const runs: string[] = [];
      
      for (let i = 0; i < 5; i++) {
        runs.push(interval.next().toISOString());
      }
      
      setNextRuns(runs);
      setDescription(getDescription(cronExpression));
      toast.success("Expresión cron analizada");
    } catch (error) {
      toast.error("Expresión cron inválida");
      setNextRuns([]);
      setDescription("");
    }
  };

  const getDescription = (cron: string): string => {
    const parts = cron.split(" ");
    const descriptions: Record<string, string> = {
      "* * * * *": "Cada minuto",
      "0 * * * *": "Cada hora",
      "0 0 * * *": "Cada día a medianoche",
      "0 0 * * 0": "Cada domingo a medianoche",
      "0 0 1 * *": "El primer día de cada mes a medianoche",
      "0 9 * * 1-5": "A las 9:00 AM de lunes a viernes",
      "*/15 * * * *": "Cada 15 minutos",
      "0 */6 * * *": "Cada 6 horas",
    };

    return descriptions[cron] || "Expresión cron personalizada";
  };

  const handleClear = () => {
    setCronExpression("* * * * *");
    setDescription("");
    setNextRuns([]);
  };

  const presets = [
    { label: "Cada minuto", value: "* * * * *" },
    { label: "Cada 5 minutos", value: "*/5 * * * *" },
    { label: "Cada 15 minutos", value: "*/15 * * * *" },
    { label: "Cada 30 minutos", value: "*/30 * * * *" },
    { label: "Cada hora", value: "0 * * * *" },
    { label: "Cada 6 horas", value: "0 */6 * * *" },
    { label: "Cada día a medianoche", value: "0 0 * * *" },
    { label: "Cada día a las 9 AM", value: "0 9 * * *" },
    { label: "Lunes a viernes a las 9 AM", value: "0 9 * * 1-5" },
    { label: "Cada domingo a medianoche", value: "0 0 * * 0" },
    { label: "Primer día del mes", value: "0 0 1 * *" },
  ];

  const aiActions = [
    {
      id: 'generate-from-text',
      label: 'Generar desde texto',
      description: 'Crea expresión cron desde lenguaje natural',
      icon: <Wand2 className="h-4 w-4" />
    },
    {
      id: 'explain',
      label: 'Explicar expresión',
      description: 'Explica cuándo se ejecuta',
      icon: <MessageSquare className="h-4 w-4" />
    }
  ];

  const handleAIResult = (action: string, result: any) => {
    if (action === 'generate-from-text' && result.expression) {
      setCronExpression(result.expression);
      handleParse();
      toast.success('Expresión cron generada por IA');
    }
  };

  const getAIInput = (action: string) => {
    if (action === 'generate-from-text') {
      return { description: description || 'Cada día a las 9 AM' };
    }
    if (action === 'explain') {
      return { expression: cronExpression };
    }
    return {};
  };

  return (
    <ToolLayout
      title="Cron Expression Generator"
      description="Genera y valida expresiones cron para tareas programadas"
    >
      <AIAssistant
        tool="cron-generator"
        actions={aiActions}
        onResult={handleAIResult}
        getInputForAction={getAIInput}
      />
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Expresión Cron</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="cron">Expresión</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="cron"
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                className="font-mono"
                placeholder="* * * * *"
              />
              <CopyButton text={cronExpression} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Formato: minuto hora día mes día-semana
            </p>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleParse} className="flex-1">
              <Clock className="h-4 w-4 mr-2" />
              Analizar
            </Button>
            <Button onClick={handleClear} variant="outline">
              <Trash2 className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          </div>

          {description && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-semibold mb-1">Descripción:</p>
              <p className="text-sm">{description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {nextRuns.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Próximas 5 Ejecuciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {nextRuns.map((run, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <span className="text-sm">
                    {new Date(run).toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {index === 0 ? "Próxima" : `+${index}`}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Expresiones Predefinidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.value}
                variant="outline"
                size="sm"
                onClick={() => {
                  setCronExpression(preset.value);
                  handleParse();
                }}
                className="justify-start text-left h-auto py-3"
              >
                <div className="flex flex-col items-start">
                  <span className="text-xs font-semibold">{preset.label}</span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {preset.value}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Guía de Sintaxis</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <div className="space-y-2">
            <p>
              <strong>Formato:</strong> minuto hora día mes día-semana
            </p>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="font-semibold mb-2">Valores:</p>
                <ul className="space-y-1">
                  <li>* = cualquier valor</li>
                  <li>*/n = cada n unidades</li>
                  <li>x-y = rango de x a y</li>
                  <li>x,y,z = valores específicos</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-2">Campos:</p>
                <ul className="space-y-1">
                  <li>Minuto: 0-59</li>
                  <li>Hora: 0-23</li>
                  <li>Día: 1-31</li>
                  <li>Mes: 1-12</li>
                  <li>Día semana: 0-7 (0 y 7 = domingo)</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </ToolLayout>
  );
}