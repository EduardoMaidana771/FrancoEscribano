import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CompromisoForm from "@/components/CompromisoForm";

export const dynamic = "force-dynamic";

export default async function CompromisoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <CompromisoForm />;
}
