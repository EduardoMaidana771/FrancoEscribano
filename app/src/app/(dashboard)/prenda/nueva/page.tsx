import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PrendaForm from "@/components/PrendaForm";

export const dynamic = "force-dynamic";

export default async function PrendaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <PrendaForm />;
}
