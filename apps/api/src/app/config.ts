/** Typed, validated configuration read once from the environment. The app refuses to start without it. */
export interface ApiConfig {
  port: number;
  production: boolean;
  databaseUrl: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  /** Origins allowed to call the API with credentials (the storefront and admin apps). */
  corsOrigins: string[];
  accessTokenMinutes: number;
  refreshTokenDays: number;
  /** Rate limiting is on everywhere except the automated test run (unless a test switches it back on). */
  rateLimit: boolean;
  /** OpenAPI docs at `/docs`: always outside production, opt-in (`API_DOCS=on`) in production. */
  docs: boolean;
}

export const API_CONFIG = Symbol('API_CONFIG');

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const problems: string[] = [];
  const need = (key: string): string => {
    const value = env[key]?.trim();
    if (!value) problems.push(`${key} is required`);
    return value ?? '';
  };
  const databaseUrl = need('DATABASE_URL');
  const jwtAccessSecret = need('JWT_ACCESS_SECRET');
  const jwtRefreshSecret = need('JWT_REFRESH_SECRET');
  for (const [key, value] of [['JWT_ACCESS_SECRET', jwtAccessSecret], ['JWT_REFRESH_SECRET', jwtRefreshSecret]] as const) {
    if (value && value.length < 32) problems.push(`${key} must be at least 32 characters`);
  }
  if (jwtAccessSecret && jwtAccessSecret === jwtRefreshSecret) problems.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ');
  const production = env['NODE_ENV'] === 'production';
  if (production && jwtAccessSecret.startsWith('dev-only-')) {
    // Still allowed so `docker compose up` works out of the box, but never silently.
    console.warn('[config] Using the dev-only JWT secrets from .env.example. Set real secrets before deploying anywhere.');
  }
  if (problems.length) throw new Error(`Invalid API configuration:\n - ${problems.join('\n - ')}`);
  return {
    port: Number(env['PORT'] ?? 3333),
    production,
    databaseUrl,
    jwtAccessSecret,
    jwtRefreshSecret,
    corsOrigins: (env['CORS_ORIGINS'] ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    accessTokenMinutes: 15,
    refreshTokenDays: 30,
    rateLimit: env['NODE_ENV'] !== 'test' || env['RATE_LIMIT'] === 'on',
    docs: !production || env['API_DOCS'] === 'on',
  };
}
