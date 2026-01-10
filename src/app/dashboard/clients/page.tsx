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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 mt-1">
            Manage your client database and contact information
          </p>
        </div>
        <AddClientDialog />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {clients && clients.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-gray-700 font-semibold">Name</TableHead>
                <TableHead className="text-gray-700 font-semibold">Email</TableHead>
                <TableHead className="text-gray-700 font-semibold">Phone</TableHead>
                <TableHead className="text-gray-700 font-semibold">Address</TableHead>
                <TableHead className="text-gray-700 font-semibold">Created</TableHead>
                <TableHead className="text-gray-700 font-semibold w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client: Client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium text-gray-900">{client.name}</TableCell>
                  <TableCell className="text-gray-700">{client.email || "—"}</TableCell>
                  <TableCell className="text-gray-700">{client.phone || "—"}</TableCell>
                  <TableCell className="text-gray-700">{client.address || "—"}</TableCell>
                  <TableCell className="text-gray-600">
                    {new Date(client.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DeleteClientButton clientId={client.id} clientName={client.name} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No clients yet</p>
            <p className="text-sm text-gray-400">
              Click "New Client" to add your first client
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
