import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TransactionFormWrapper from "@/components/TransactionFormWrapper";

export const dynamic = "force-dynamic";

export default async function NuevaCompraventaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("next_matriz_number, next_folio_number, paper_series_proto, paper_number_proto, paper_series_testimony, paper_numbers_testimony")
    .eq("id", user.id)
    .single();

  return (
    <TransactionFormWrapper
      userId={user.id}
      nextMatriz={profile?.next_matriz_number ?? 133}
      nextFolio={profile?.next_folio_number ?? 1}
      paperDefaults={{
        paper_series_proto: profile?.paper_series_proto ?? "",
        paper_number_proto: profile?.paper_number_proto ?? "",
        paper_series_testimony: profile?.paper_series_testimony ?? "",
        paper_numbers_testimony: profile?.paper_numbers_testimony ?? "",
      }}
    />
  );
}
