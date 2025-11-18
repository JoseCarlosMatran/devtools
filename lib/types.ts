
export interface ToolHistory {
  id: string;
  timestamp: number;
  input: string;
  output?: string;
  toolType: string;
  metadata?: Record<string, any>;
}

export interface ApiRequest {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    time: number;
  };
}

export interface JsonFormatterState {
  input: string;
  output: string;
  isValid: boolean;
  error?: string;
  mode: 'format' | 'minify' | 'validate';
}

export interface RegexTestResult {
  matches: RegExpMatchArray[];
  isValid: boolean;
  flags: string;
  explanation?: string;
}

export interface HashResult {
  md5: string;
  sha1: string;
  sha256: string;
  sha512: string;
}

export interface ColorFormats {
  hex: string;
  rgb: string;
  rgba: string;
  hsl: string;
  hsla: string;
}

export interface DiffResult {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
  count?: number;
}

export interface JWTDecoded {
  header: Record<string, any>;
  payload: Record<string, any>;
  signature: string;
  isValid: boolean;
  error?: string;
}
