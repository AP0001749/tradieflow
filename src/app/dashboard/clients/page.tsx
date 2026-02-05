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

  return (
    <div className="space-y-6 md:space-y-8">
      <SubscriptionBanner resourceType="clients" />
      
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-in fade-in slide-in-from-top-4 duration-700">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Clients</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Manage your client database
          </p>
        </div>
        <div className="shrink-0">
          <AddClientDialog />
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-x-auto animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
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
                <TableRow key={client.id} className="group cursor-default">
                  <TableCell className="font-medium">{client.name}</TableCell>
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
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-2">No clients yet</p>
            <p className="text-sm text-muted-foreground/80">
              Click &quot;New Client&quot; to add your first client
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
