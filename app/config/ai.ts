// ============================================
// AI CONFIGURATION - CROW COURSE STUDIO
// ============================================

export type AIMode = "mock" | "openai" | "anthropic";

export interface AIConfig {
  mode: AIMode;
  openai?: {
    apiKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  anthropic?: {
    apiKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  mock?: {
    enableRealisticContent: boolean;
    simulatedDelay: boolean;
    delayMs: number;
  };
}

// Configuración actual del sistema
export const AI_CONFIG: AIConfig = {
  // MODO DESARROLLO - SIN CONSUMIR APIS EXTERNAS
  mode: "mock",
  
  // Configuración para OpenAI (futuro)
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4",
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || "0.7"),
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || "3000"),
  },
  
  // Configuración para Anthropic (futuro)
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
    model: process.env.ANTHROPIC_MODEL || "claude-3-haiku-20240307",
    temperature: parseFloat(process.env.ANTHROPIC_TEMPERATURE || "0.7"),
    maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || "3000"),
  },
  
  // Configuración para Mock Provider
  mock: {
    enableRealisticContent: true,
    simulatedDelay: true,
    delayMs: 2000, // 2 segundos por operación
  },
};

// Función para cambiar el modo de IA
export function setAIMode(mode: AIMode): void {
  AI_CONFIG.mode = mode;
}

// Validar configuración
export function validateAIConfig(): boolean {
  switch (AI_CONFIG.mode) {
    case "mock":
      return true;
    case "openai":
      return !!AI_CONFIG.openai?.apiKey;
    case "anthropic":
      return !!AI_CONFIG.anthropic?.apiKey;
    default:
      return false;
  }
}