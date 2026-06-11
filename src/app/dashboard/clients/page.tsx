import { createClient } from "@/lib/supabase/server";
import { Client } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddClientDialog } from "./add-client-dialog";
import { DeleteClientButton } from "./delete-client-button";
import { EditClientDialog } from "./edit-client-dialog";
import { SubscriptionBanner } from "@/components/subscription-banner";
import { checkSubscriptionLimits } from "@/lib/subscription";
import { getLimitReachedMessage, getResourceLimit } from "@/lib/subscription-limits";
import { Users } from "lucide-react";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default async function ClientsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: clients, error } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching clients:", error);
  }

  const subscription = await checkSubscriptionLimits();
  const clientLimit = getResourceLimit(subscription.limits, "clients");
  const hasReachedFreeTierLimit =
    !subscription.isPro &&
    (subscription.current?.clients ?? 0) >=
      (clientLimit ?? Number.POSITIVE_INFINITY);
  const createDisabledReason = subscription.error
    ? "Usage limits are temporarily unavailable. Try again in a moment."
    : hasReachedFreeTierLimit && typeof clientLimit === "number"
      ? getLimitReachedMessage("clients", clientLimit)
      : undefined;

  return (
    <div className="space-y-6 md:space-y-8">
      <SubscriptionBanner resourceType="clients" />
      
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-in fade-in slide-in-from-top-4 duration-700">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Clients</h1>
            {clients && clients.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-sm font-semibold text-muted-foreground">
                {clients.length}
              </span>
            )}
          </div>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Manage your client database
          </p>
        </div>
        <div className="shrink-0">
          <AddClientDialog disabledReason={createDisabledReason} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        {clients && clients.length > 0 ? (
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow className="border-border/60">
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Phone</TableHead>
                <TableHead className="font-semibold">Address</TableHead>
                <TableHead className="font-semibold">Created</TableHead>
                <TableHead className="font-semibold w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client: Client) => (
                <TableRow key={client.id} className="group cursor-default hover:bg-muted/40 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/15">
                        <span className="text-xs font-bold text-primary">{getInitials(client.name)}</span>
                      </div>
                      <span>{client.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{client.email || "--"}</TableCell>
                  <TableCell className="text-muted-foreground">{client.phone || "--"}</TableCell>
                  <TableCell className="text-muted-foreground">{client.address || "--"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(client.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <EditClientDialog client={client} />
                      <DeleteClientButton clientId={client.id} clientName={client.name} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Users className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <div>
              <p className="font-medium text-foreground">No clients yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your first client to start tracking jobs and invoices
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
