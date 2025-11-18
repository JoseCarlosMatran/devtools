
"use client";

import React from 'react';
import { Palette, Pipette, Shuffle, Copy, Eye, Contrast, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIAssistant } from "@/components/ai-assistant";
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToolLayout } from '@/components/tool-layout';
import { CopyButton } from '@/components/copy-button';
import { HistoryPanel } from '@/components/history-panel';
import { colorUtils, historyManager } from '@/lib/utils';
import type { ToolHistory, ColorFormats } from '@/lib/types';
import { toast } from 'sonner';

export default function ColorPickerPage() {
  const [color, setColor] = React.useState('#3b82f6');
  const [formats, setFormats] = React.useState<ColorFormats>({
    hex: '#3b82f6',
    rgb: 'rgb(59, 130, 246)',
    rgba: 'rgba(59, 130, 246, 1)',
    hsl: 'hsl(217, 91%, 60%)',
    hsla: 'hsla(217, 91%, 60%, 1)'
  });
  const [palette, setPalette] = React.useState<string[]>([]);
  const [history, setHistory] = React.useState<ToolHistory[]>([]);

  React.useEffect(() => {
    setHistory(historyManager.get('color-picker'));
  }, []);

  const updateFormats = (hexColor: string) => {
    const rgb = colorUtils.hexToRgb(hexColor);
    if (!rgb) return;

    const hsl = colorUtils.rgbToHsl(rgb.r, rgb.g, rgb.b);
    
    const newFormats: ColorFormats = {
      hex: hexColor,
      rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
      rgba: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`,
      hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
      hsla: `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 1)`
    };

    setFormats(newFormats);

    // Save to history
    historyManager.add('color-picker', {
      input: hexColor,
      output: JSON.stringify(newFormats),
      metadata: {
        hex: hexColor,
        rgb: `${rgb.r},${rgb.g},${rgb.b}`,
        hsl: `${hsl.h},${hsl.s},${hsl.l}`
      }
    });
    setHistory(historyManager.get('color-picker'));
  };

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    updateFormats(newColor);
  };

  const handleHexInputChange = (value: string) => {
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      handleColorChange(value);
    }
  };

  const generatePalette = (baseColor: string, type: 'complementary' | 'analogous' | 'triadic' | 'monochromatic') => {
    const rgb = colorUtils.hexToRgb(baseColor);
    if (!rgb) return [];

    const hsl = colorUtils.rgbToHsl(rgb.r, rgb.g, rgb.b);
    const colors: string[] = [baseColor];

    switch (type) {
      case 'complementary':
        // Complementary color (180 degrees opposite)
        const compHue = (hsl.h + 180) % 360;
        colors.push(colorUtils.rgbToHex(...hslToRgb(compHue, hsl.s, hsl.l)));
        // Add some variations
        colors.push(colorUtils.rgbToHex(...hslToRgb(hsl.h, hsl.s, Math.max(10, hsl.l - 20))));
        colors.push(colorUtils.rgbToHex(...hslToRgb(hsl.h, hsl.s, Math.min(90, hsl.l + 20))));
        colors.push(colorUtils.rgbToHex(...hslToRgb(compHue, hsl.s, Math.max(10, hsl.l - 20))));
        break;

      case 'analogous':
        // Analogous colors (adjacent hues)
        for (let i = 1; i <= 4; i++) {
          const newHue = (hsl.h + (i * 30)) % 360;
          colors.push(colorUtils.rgbToHex(...hslToRgb(newHue, hsl.s, hsl.l)));
        }
        break;

      case 'triadic':
        // Triadic colors (120 degrees apart)
        const triad1 = (hsl.h + 120) % 360;
        const triad2 = (hsl.h + 240) % 360;
        colors.push(colorUtils.rgbToHex(...hslToRgb(triad1, hsl.s, hsl.l)));
        colors.push(colorUtils.rgbToHex(...hslToRgb(triad2, hsl.s, hsl.l)));
        // Add lighter and darker versions
        colors.push(colorUtils.rgbToHex(...hslToRgb(hsl.h, hsl.s, Math.min(90, hsl.l + 20))));
        colors.push(colorUtils.rgbToHex(...hslToRgb(hsl.h, hsl.s, Math.max(10, hsl.l - 20))));
        break;

      case 'monochromatic':
        // Monochromatic variations (same hue, different lightness)
        const lightnesses = [20, 40, 60, 80];
        lightnesses.forEach(l => {
          if (l !== hsl.l) {
            colors.push(colorUtils.rgbToHex(...hslToRgb(hsl.h, hsl.s, l)));
          }
        });
        break;
    }

    return colors.slice(0, 5);
  };

  const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
      r = c; g = 0; b = x;
    }

    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255)
    ];
  };

  const handleGeneratePalette = (type: 'complementary' | 'analogous' | 'triadic' | 'monochromatic') => {
    const newPalette = generatePalette(color, type);
    setPalette(newPalette);
    toast.success(`Generated ${type} palette`);
  };

  const handleRandomColor = () => {
    const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    handleColorChange(randomColor);
  };

  const handleRestore = (entry: ToolHistory) => {
    const metadata = entry.metadata;
    if (metadata?.hex) {
      handleColorChange(metadata.hex);
    }
    toast.success('Restored from history');
  };

  const handleClearHistory = () => {
    historyManager.clear('color-picker');
    setHistory([]);
    toast.success('History cleared');
  };

  const formatEntries: Array<{key: keyof ColorFormats, label: string, description: string}> = [
    { key: 'hex', label: 'HEX', description: 'Hexadecimal notation' },
    { key: 'rgb', label: 'RGB', description: 'Red, Green, Blue' },
    { key: 'rgba', label: 'RGBA', description: 'RGB with Alpha' },
    { key: 'hsl', label: 'HSL', description: 'Hue, Saturation, Lightness' },
    { key: 'hsla', label: 'HSLA', description: 'HSL with Alpha' }
  ];

  return (
    <ToolLayout
      title="Color Picker & Palette Generator"
      description="Pick colors and generate palettes with HEX, RGB, HSL formats"
      icon={Palette}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Tool */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Pipette className="w-5 h-5" />
                Color Picker
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Color Picker */}
              <div className="space-y-4">
                <div className="flex gap-4 items-center">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pick Color</label>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="w-16 h-16 border border-border rounded-lg cursor-pointer"
                    />
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">HEX Value</label>
                    <div className="flex gap-2">
                      <Input
                        value={color}
                        onChange={(e) => handleHexInputChange(e.target.value)}
                        placeholder="#000000"
                        className="font-mono"
                      />
                      <Button variant="outline" size="icon" onClick={handleRandomColor}>
                        <Shuffle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="w-24 h-24 rounded-lg border-2 border-border shadow-inner" style={{ backgroundColor: color }}>
                  </div>
                </div>
              </div>

              {/* Color Formats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Color Formats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {formatEntries.map(({ key, label, description }) => (
                      <div key={key} className="flex items-center gap-3 p-3 border border-border/50 rounded-lg">
                        <div className="w-8 h-8 rounded border-2 border-border" style={{ backgroundColor: color }}></div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="font-semibold">{label}</Badge>
                            <span className="text-sm text-muted-foreground">{description}</span>
                          </div>
                          <code className="text-sm font-mono bg-muted/50 px-2 py-1 rounded">
                            {formats[key]}
                          </code>
                        </div>
                        <CopyButton text={formats[key]} size="sm" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Palette Generator */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Palette Generator
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleGeneratePalette('complementary')}>
                      Complementary
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleGeneratePalette('analogous')}>
                      Analogous
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleGeneratePalette('triadic')}>
                      Triadic
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleGeneratePalette('monochromatic')}>
                      Monochromatic
                    </Button>
                  </div>

                  {palette.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Generated Palette</h4>
                        <CopyButton text={palette.join(', ')} label="Copy All" size="sm" />
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {palette.map((paletteColor, index) => (
                          <div key={index} className="space-y-2">
                            <div
                              className="w-full h-16 rounded-lg border-2 border-border cursor-pointer hover:scale-105 transition-transform"
                              style={{ backgroundColor: paletteColor }}
                              onClick={() => handleColorChange(paletteColor)}
                            />
                            <div className="flex items-center justify-between">
                              <code className="text-xs font-mono">{paletteColor}</code>
                              <CopyButton text={paletteColor} size="sm" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Color Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Color Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">On White Background</h4>
                      <div className="p-4 bg-white border rounded-lg text-center" style={{ color: color }}>
                        <p className="font-bold text-lg">Sample Text</p>
                        <p className="text-sm">This is how your color looks on white background</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">On Dark Background</h4>
                      <div className="p-4 bg-gray-900 border rounded-lg text-center" style={{ color: color }}>
                        <p className="font-bold text-lg">Sample Text</p>
                        <p className="text-sm">This is how your color looks on dark background</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </div>

        {/* History Panel */}
        <div className="lg:col-span-1">
          <HistoryPanel
            history={history}
            onRestore={handleRestore}
            onClear={handleClearHistory}
          />
        </div>
      </div>
    </ToolLayout>
  );
}
