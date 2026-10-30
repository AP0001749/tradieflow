import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DispatchAuditRequestForm } from "@/components/book/dispatch-audit-request-form";

export default function BookIndexPage() {
  return (
    <div className="page-shell space-y-8">
      <div className="text-center space-y-3">
        <p className="hero-pill">Free Dispatch Audit</p>
        <h1 className="tf-display text-4xl md:text-5xl">Request a free dispatch audit</h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Tell us how missed calls and urgent jobs leak revenue today. We will map a recovery
          workflow for your crew and reply within one business day.
        </p>
      </div>

      <Card className="glass-card max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Dispatch audit request</CardTitle>
          <CardDescription>
            No login required. Existing customers should still use their unique
            <span className="font-mono"> /book/your-slug </span>
            lead link from Settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DispatchAuditRequestForm />
        </CardContent>
      </Card>
    </div>
  );
}
