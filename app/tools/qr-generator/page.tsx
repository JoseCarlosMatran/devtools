"use client";

import { useState, useEffect } from "react";
import qrcode from "qrcode-generator";
import { ToolLayout } from "@/components/tool-layout";
import { AIAssistant } from "@/components/ai-assistant";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { QrCode, Download, Trash2 , Zap} from "lucide-react";
import { toast } from "sonner";

export default function QRGeneratorPage() {
  const [text, setText] = useState("");
  const [qrSvg, setQrSvg] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("qr-generator-text");
    if (saved) {
      setText(saved);
      generateQR(saved);
    }
  }, []);

  const generateQR = (value: string) => {
    if (!value) {
      setQrSvg("");
      return;
    }

    try {
      const qr = qrcode(0, "M");
      qr.addData(value);
      qr.make();
      setQrSvg(qr.createSvgTag(4, 0));
      localStorage.setItem("qr-generator-text", value);
      toast.success("QR Code generado");
    } catch (error) {
      toast.error("Error al generar QR Code");
      setQrSvg("");
    }
  };

  const handleGenerate = () => {
    generateQR(text);
  };

  const handleDownload = () => {
    if (!qrSvg) return;

    const blob = new Blob([qrSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qrcode.svg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("QR Code descargado");
  };

  const handleClear = () => {
    setText("");
    setQrSvg("");
    localStorage.removeItem("qr-generator-text");
  };

  return (
    <ToolLayout
      title="QR Code Generator"
      description="Genera códigos QR personalizados para cualquier texto o URL"
    >
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configuración</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="text">Texto o URL</Label>
              <Input
                id="text"
                placeholder="https://ejemplo.com o cualquier texto"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="mt-2"
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={handleGenerate} disabled={!text} className="flex-1">
                <QrCode className="h-4 w-4 mr-2" />
                Generar QR
              </Button>
              <Button onClick={handleClear} variant="outline">
                <Trash2 className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">QR Code</CardTitle>
          </CardHeader>
          <CardContent>
            {qrSvg ? (
              <div className="space-y-4">
                <div
                  className="flex items-center justify-center p-8 bg-white rounded-lg"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
                <Button onClick={handleDownload} variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar SVG
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">
                  El QR Code aparecerá aquí
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Ejemplos de uso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setText("https://github.com");
              generateQR("https://github.com");
            }}
          >
            URL de sitio web
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setText("mailto:contact@example.com");
              generateQR("mailto:contact@example.com");
            }}
          >
            Email
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setText("tel:+1234567890");
              generateQR("tel:+1234567890");
            }}
          >
            Teléfono
          </Button>
        </CardContent>
      </Card>
    </ToolLayout>
  );
}
