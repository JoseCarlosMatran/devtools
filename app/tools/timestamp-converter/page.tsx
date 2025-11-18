"use client";

import { useState, useEffect } from "react";
import { ToolLayout } from "@/components/tool-layout";
import { AIAssistant } from "@/components/ai-assistant";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/copy-button";
import { Clock, Trash2, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function TimestampConverterPage() {
  const [timestamp, setTimestamp] = useState("");
  const [datetime, setDatetime] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCurrentTime(Date.now());
    
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTimestampToDate = () => {
    try {
      const ts = parseInt(timestamp);
      if (isNaN(ts)) {
        toast.error("Timestamp inválido");
        return;
      }
      // Handle both seconds and milliseconds
      const date = new Date(ts > 10000000000 ? ts : ts * 1000);
      setDatetime(date.toISOString());
      toast.success("Convertido a fecha");
    } catch (error) {
      toast.error("Error al convertir timestamp");
    }
  };

  const handleDateToTimestamp = () => {
    try {
      const date = new Date(datetime);
      if (isNaN(date.getTime())) {
        toast.error("Fecha inválida");
        return;
      }
      setTimestamp(Math.floor(date.getTime() / 1000).toString());
      toast.success("Convertido a timestamp");
    } catch (error) {
      toast.error("Error al convertir fecha");
    }
  };

  const handleUseCurrent = () => {
    const now = Math.floor(Date.now() / 1000);
    setTimestamp(now.toString());
    setDatetime(new Date().toISOString());
  };

  const handleClear = () => {
    setTimestamp("");
    setDatetime("");
  };

  return (
    <ToolLayout
      title="Timestamp Converter"
      description="Convierte entre Unix timestamp y fechas legibles"
    >
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Tiempo Actual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!mounted ? (
            <div className="flex items-center justify-center py-4">
              <span className="text-sm text-muted-foreground">Cargando...</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Unix (segundos):</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold">
                    {Math.floor(currentTime / 1000)}
                  </span>
                  <CopyButton text={Math.floor(currentTime / 1000).toString()} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Unix (milisegundos):</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold">{currentTime}</span>
                  <CopyButton text={currentTime.toString()} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">ISO 8601:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-sm">
                    {new Date(currentTime).toISOString()}
                  </span>
                  <CopyButton text={new Date(currentTime).toISOString()} />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Timestamp a Fecha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="timestamp">Unix Timestamp</Label>
              <Input
                id="timestamp"
                placeholder="1699999999"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                className="mt-2 font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Segundos o milisegundos desde 1970-01-01
              </p>
            </div>
            <Button onClick={handleTimestampToDate} disabled={!timestamp} className="w-full">
              Convertir a Fecha
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fecha a Timestamp</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="datetime">Fecha y Hora</Label>
              <Input
                id="datetime"
                type="datetime-local"
                value={datetime.slice(0, 16)}
                onChange={(e) => setDatetime(e.target.value)}
                className="mt-2"
              />
            </div>
            <Button onClick={handleDateToTimestamp} disabled={!datetime} className="w-full">
              Convertir a Timestamp
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3 mt-6">
        <Button onClick={handleUseCurrent} variant="outline" className="flex-1">
          <Clock className="h-4 w-4 mr-2" />
          Usar Tiempo Actual
        </Button>
        <Button onClick={handleClear} variant="outline">
          <Trash2 className="h-4 w-4 mr-2" />
          Limpiar
        </Button>
      </div>
    </ToolLayout>
  );
}
