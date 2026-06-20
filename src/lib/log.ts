type LogContext = Record<string, unknown>;

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    };
  }
  return { message: String(error) };
}

export function logError(event: string, error: unknown, context: LogContext = {}) {
  console.error(
    JSON.stringify({
      level: "error",
      event,
      context,
      error: serializeError(error),
      at: new Date().toISOString(),
    }),
  );
}
