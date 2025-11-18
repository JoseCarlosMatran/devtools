
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as CryptoJS from 'crypto-js';
import type { ToolHistory, HashResult } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// LocalStorage utilities
export const storage = {
  get: <T>(key: string, defaultValue?: T): T | null => {
    if (typeof window === 'undefined') return defaultValue || null;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue || null;
    } catch {
      return defaultValue || null;
    }
  },
  
  set: <T>(key: string, value: T): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },
  
  remove: (key: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  }
};

// History management
export const historyManager = {
  add: (toolType: string, entry: Omit<ToolHistory, 'id' | 'timestamp' | 'toolType'>): void => {
    const key = `history_${toolType}`;
    const history = storage.get<ToolHistory[]>(key, []);
    const newEntry: ToolHistory = {
      ...entry,
      id: Date.now().toString(),
      timestamp: Date.now(),
      toolType
    };
    
    // Add to beginning and keep only last 10
    const updatedHistory = [newEntry, ...(history || [])].slice(0, 10);
    storage.set(key, updatedHistory);
  },
  
  get: (toolType: string): ToolHistory[] => {
    return storage.get<ToolHistory[]>(`history_${toolType}`, []) || [];
  },
  
  clear: (toolType: string): void => {
    storage.remove(`history_${toolType}`);
  }
};

// Clipboard utilities
export const clipboard = {
  copy: async (text: string): Promise<boolean> => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const result = document.execCommand('copy');
        document.body.removeChild(textArea);
        return result;
      }
    } catch {
      return false;
    }
  }
};

// JSON utilities
export const jsonUtils = {
  format: (json: string, indent = 2): { formatted: string; isValid: boolean; error?: string } => {
    try {
      const parsed = JSON.parse(json);
      return {
        formatted: JSON.stringify(parsed, null, indent),
        isValid: true
      };
    } catch (error) {
      return {
        formatted: json,
        isValid: false,
        error: error instanceof Error ? error.message : 'Invalid JSON'
      };
    }
  },
  
  minify: (json: string): { minified: string; isValid: boolean; error?: string } => {
    try {
      const parsed = JSON.parse(json);
      return {
        minified: JSON.stringify(parsed),
        isValid: true
      };
    } catch (error) {
      return {
        minified: json,
        isValid: false,
        error: error instanceof Error ? error.message : 'Invalid JSON'
      };
    }
  },
  
  validate: (json: string): { isValid: boolean; error?: string } => {
    try {
      JSON.parse(json);
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Invalid JSON'
      };
    }
  }
};

// Hash utilities
export const hashUtils = {
  generate: (input: string): HashResult => {
    return {
      md5: CryptoJS.MD5(input).toString(),
      sha1: CryptoJS.SHA1(input).toString(),
      sha256: CryptoJS.SHA256(input).toString(),
      sha512: CryptoJS.SHA512(input).toString()
    };
  }
};

// Base64 utilities
export const base64Utils = {
  encode: (input: string): string => {
    try {
      return btoa(input);
    } catch (error) {
      throw new Error('Invalid input for Base64 encoding');
    }
  },
  
  decode: (input: string): string => {
    try {
      return atob(input);
    } catch (error) {
      throw new Error('Invalid Base64 string');
    }
  }
};

// JWT utilities
export const jwtUtils = {
  decode: (token: string): { header: any; payload: any; signature: string; isValid: boolean; error?: string } => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return {
          header: {},
          payload: {},
          signature: '',
          isValid: false,
          error: 'Invalid JWT format - must have 3 parts'
        };
      }
      
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));
      const signature = parts[2];
      
      return {
        header,
        payload,
        signature,
        isValid: true
      };
    } catch (error) {
      return {
        header: {},
        payload: {},
        signature: '',
        isValid: false,
        error: error instanceof Error ? error.message : 'Invalid JWT token'
      };
    }
  }
};

// Color utilities
export const colorUtils = {
  hexToRgb: (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  },
  
  rgbToHex: (r: number, g: number, b: number): string => {
    return "#" + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }).join("");
  },
  
  rgbToHsl: (r: number, g: number, b: number): { h: number; s: number; l: number } => {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h: number, s: number, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        default: h = 0;
      }
      h /= 6;
    }
    
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }
};

// Format time utilities
export const formatTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
};
