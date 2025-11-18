"use client";

import { AIAssistant } from "@/components/ai-assistant";
import { Wand2, MessageSquare, FileText } from "lucide-react";

import { useState, useEffect } from "react";
import { ToolLayout } from "@/components/tool-layout";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export default function MarkdownEditorPage() {
  const [markdown, setMarkdown] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("markdown-editor");
    if (saved) setMarkdown(saved);
  }, []);

  useEffect(() => {
    if (markdown) {
      localStorage.setItem("markdown-editor", markdown);
    }
  }, [markdown]);

  const handleClear = () => {
    setMarkdown("");
    localStorage.removeItem("markdown-editor");
  };

  const renderMarkdown = (text: string) => {
    let html = text;
    
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
    
    // Links
    html = html.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Code inline
    html = html.replace(/`(.*?)`/gim, '<code>$1</code>');
    
    // Line breaks
    html = html.replace(/\n/gim, '<br />');
    
    return html;
  };

  return (
    <ToolLayout
      title="Markdown Editor"
      description="Editor y previsualizador de Markdown en tiempo real"
    >
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Editor</CardTitle>
              <CopyButton text={markdown} />
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="# Tu Markdown aquí

## Subtítulo

**Negrita** y *cursiva*

[Link](https://example.com)

`código en línea`"
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              rows={20}
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vista Previa</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-sm dark:prose-invert max-w-none min-h-[500px] p-4 border rounded-md"
              dangerouslySetInnerHTML={{
                __html: markdown ? renderMarkdown(markdown) : "<p class='text-muted-foreground'>La vista previa aparecerá aquí...</p>",
              }}
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3 mt-6">
        <Button onClick={handleClear} variant="outline">
          <Trash2 className="h-4 w-4 mr-2" />
          Limpiar
        </Button>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Sintaxis Soportada</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold mb-2">Formato:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li># Encabezado 1</li>
                <li>## Encabezado 2</li>
                <li>### Encabezado 3</li>
                <li>**negrita**</li>
                <li>*cursiva*</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-2">Enlaces y código:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>[texto](url)</li>
                <li>`código`</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </ToolLayout>
  );
}
