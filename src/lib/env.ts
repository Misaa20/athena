const REQUIRED_PRODUCTION_ENV = [
  "DATABASE_URL",
  "NEXT_PUBLIC_PRIVY_APP_ID",
  "PRIVY_APP_SECRET",
] as const;

export function missingProductionEnv(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV !== "production") return [];
  return REQUIRED_PRODUCTION_ENV.filter((key) => !env[key]);
}

export function assertProductionEnv() {
  const missing = missingProductionEnv();
  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
  }
}
