import "server-only";

export function getAppOrigin() {
  const origin = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!origin) {
    throw new Error("Missing NEXT_PUBLIC_APP_URL environment variable");
  }

  return origin.replace(/\/+$/, "");
}
