import { redirect } from "next/navigation";

export default function Home() {
  // Direct the user immediately to the application core.
  // The Dashboard's protection logic will handle auth checks.
  redirect("/dashboard");
}
