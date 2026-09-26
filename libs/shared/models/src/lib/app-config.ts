export interface AppConfig {
  /** Use in-memory mock adapters instead of the real backend. */
  useMocks: boolean;
  /** Simulated latency for mock adapters (ms); ignored on the server. */
  mockLatencyMs?: number;
  apiBaseUrl: string;
  /** Public Razorpay key id only. Secrets never live in the frontend. */
  razorpayKeyId?: string;
  siteName: string;
  siteUrl: string;
  features: Record<string, boolean>;
}
