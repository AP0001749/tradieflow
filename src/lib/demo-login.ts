export function isDemoLoginConfigured() {
  return Boolean(
    process.env.DEMO_LOGIN_EMAIL?.trim() && process.env.DEMO_LOGIN_PASSWORD,
  );
}
