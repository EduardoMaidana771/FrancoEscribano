import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TransactionForm from "@/components/TransactionForm";

export const dynamic = "force-dynamic";

export default async function NuevaCompraventaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("next_matriz_number, next_folio_number")
    .eq("id", user.id)
    .single();

  return (
    <TransactionForm
      userId={user.id}
      nextMatriz={profile?.next_matriz_number ?? 133}
      nextFolio={profile?.next_folio_number ?? 1}
    />
  );
}
