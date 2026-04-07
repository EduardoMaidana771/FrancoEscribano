import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CompraventasList from "@/components/CompraventasList";

export const dynamic = "force-dynamic";

export default async function CompraventasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: rawTransactions } = await supabase
    .from("transactions")
    .select(`
      id,
      status,
      transaction_date,
      folder_name,
      price_amount,
      price_currency,
      created_at,
      seller_id,
      seller2_id,
      buyer_id,
      buyer2_id,
      vehicle_id,
      seller:clients!transactions_seller_id_fkey(full_name),
      buyer:clients!transactions_buyer_id_fkey(full_name),
      vehicle:vehicles!transactions_vehicle_id_fkey(brand, model, plate)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Supabase may return joined objects or arrays depending on relationship type
  // Normalize to ensure single objects
  const transactions = (rawTransactions ?? []).map((tx) => ({
    ...tx,
    seller: Array.isArray(tx.seller) ? tx.seller[0] ?? null : tx.seller,
    buyer: Array.isArray(tx.buyer) ? tx.buyer[0] ?? null : tx.buyer,
    vehicle: Array.isArray(tx.vehicle) ? tx.vehicle[0] ?? null : tx.vehicle,
  }));

  return <CompraventasList transactions={transactions} />;
}
