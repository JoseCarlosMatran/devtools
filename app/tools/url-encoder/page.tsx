"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tool-layout";
import { AIAssistant } from "@/components/ai-assistant";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/copy-button";
import { ArrowRightLeft, Trash2 , CheckCircle, Info} from "lucide-react";
import { toast } from "sonner";

export default function URLEncoderPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<"encode" | "decode">("encode");

  const handleProcess = () => {
    try {
      if (mode === "encode") {
        setOutput(encodeURIComponent(input));
        toast.success("URL codificada");
      } else {
        setOutput(decodeURIComponent(input));
        toast.success("URL decodificada");
      }
    } catch (error) {
      toast.error("Error al procesar URL");
      setOutput("");
    }
  };

  const handleSwap = () => {
    setMode(mode === "encode" ? "decode" : "encode");
    setInput(output);
    setOutput(input);
  };

  const handleClear = () => {
    setInput("");
    setOutput("");
  };

  return (
    <ToolLayout
      title="URL Encoder/Decoder"
      description="Codifica y decodifica URLs y componentes URL"
    >
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {mode === "encode" ? "URL Original" : "URL Codificada"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder={
                mode === "encode"
                  ? "https://example.com/search?q=hello world"
                  : "https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dhello%20world"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {mode === "encode" ? "URL Codificada" : "URL Decodificada"}
              </CardTitle>
              {output && <CopyButton text={output} />}
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={output}
              readOnly
              placeholder="El resultado aparecerá aquí..."
              rows={10}
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3 mt-6">
        <Button onClick={handleProcess} disabled={!input} className="flex-1">
          {mode === "encode" ? "Codificar" : "Decodificar"}
        </Button>
        <Button onClick={handleSwap} variant="outline" disabled={!output}>
          <ArrowRightLeft className="h-4 w-4 mr-2" />
          Invertir
        </Button>
        <Button onClick={handleClear} variant="outline">
          <Trash2 className="h-4 w-4 mr-2" />
          Limpiar
        </Button>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Información</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Codificar:</strong> Convierte caracteres especiales en formato URL-safe
          </p>
          <p>
            <strong>Decodificar:</strong> Convierte formato URL-encoded de vuelta a texto normal
          </p>
          <p className="mt-4">
            Ejemplo: "hello world" se convierte en "hello%20world"
          </p>
        </CardContent>
      </Card>
    </ToolLayout>
  );
}
