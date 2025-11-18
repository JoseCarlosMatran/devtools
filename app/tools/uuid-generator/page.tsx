"use client";

import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ToolLayout } from "@/components/tool-layout";
import { AIAssistant } from "@/components/ai-assistant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/copy-button";
import { RefreshCw, Hash, Trash2 , Sparkles} from "lucide-react";
import { toast } from "sonner";

export default function UUIDGeneratorPage() {
  const [uuids, setUuids] = useState<string[]>([]);
  const [count, setCount] = useState("1");

  const handleGenerate = () => {
    const num = parseInt(count) || 1;
    if (num < 1 || num > 100) {
      toast.error("Genera entre 1 y 100 UUIDs");
      return;
    }

    const generated = Array.from({ length: num }, () => uuidv4());
    setUuids(generated);
    toast.success(`${num} UUID${num > 1 ? "s" : ""} generado${num > 1 ? "s" : ""}`);
  };

  const handleClear = () => {
    setUuids([]);
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(uuids.join("\n"));
    toast.success("Todos los UUIDs copiados");
  };

  return (
    <ToolLayout
      title="UUID Generator"
      description="Genera identificadores únicos universales (UUIDs v4)"
    >
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Generar UUIDs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="count">Cantidad</Label>
            <Input
              id="count"
              type="number"
              min="1"
              max="100"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Máximo 100 UUIDs a la vez
            </p>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleGenerate} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Generar
            </Button>
            {uuids.length > 0 && (
              <>
                <Button onClick={handleCopyAll} variant="outline">
                  Copiar Todos
                </Button>
                <Button onClick={handleClear} variant="outline">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpiar
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {uuids.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                UUIDs Generados ({uuids.length})
              </CardTitle>
              <Badge variant="secondary">
                <Hash className="h-3 w-3 mr-1" />
                {uuids.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {uuids.map((uuid, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <span className="font-mono text-sm">{uuid}</span>
                  <CopyButton text={uuid} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">¿Qué es un UUID?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Un UUID (Universally Unique Identifier) es un identificador de 128 bits
            que se utiliza para identificar información en sistemas informáticos.
          </p>
          <p>
            Los UUID v4 son generados aleatoriamente y tienen una probabilidad
            extremadamente baja de colisión.
          </p>
          <p className="mt-4">
            <strong>Formato:</strong> xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
          </p>
        </CardContent>
      </Card>
    </ToolLayout>
  );
}

// Add Badge component import
import { Badge } from "@/components/ui/badge";
