import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CertificacionImmForm from "@/components/CertificacionImmForm";

export const dynamic = "force-dynamic";

export default async function CertificacionImmPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <CertificacionImmForm />;
}
