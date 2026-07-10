// ─── Environment Variable Validation ─────────────────────────────────────────

export function validateEnv() {
  const required = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
  };

  const optional = {
    ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY,
    NEWS_API_KEY: process.env.NEWS_API_KEY,
  };

  const missing: string[] = [];
  for (const [key, value] of Object.entries(required)) {
    if (!value) missing.push(key);
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please copy .env.example to .env.local and fill in the values.`
    );
  }

  return {
    geminiApiKey: required.GEMINI_API_KEY!,
    tavilyApiKey: required.TAVILY_API_KEY!,
    alphaVantageApiKey: optional.ALPHA_VANTAGE_API_KEY || '',
    newsApiKey: optional.NEWS_API_KEY || '',
  };
}

export type Env = ReturnType<typeof validateEnv>;
