import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import FileManager from "@/components/FileManager";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FolderPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get current folder
  const { data: currentFolder } = await supabase
    .from("folders")
    .select("*")
    .eq("id", id)
    .single();

  if (!currentFolder) redirect("/archivos");

  // Build breadcrumbs
  const breadcrumbs: { id: string | null; name: string }[] = [
    { id: null, name: "Mis Archivos" },
  ];

  if (currentFolder.parent_id) {
    const { data: parentFolder } = await supabase
      .from("folders")
      .select("id, name")
      .eq("id", currentFolder.parent_id)
      .single();
    if (parentFolder) {
      breadcrumbs.push({ id: parentFolder.id, name: parentFolder.name });
    }
  }
  breadcrumbs.push({ id: currentFolder.id, name: currentFolder.name });

  // Get child folders and files
  const [{ data: folders }, { data: files }] = await Promise.all([
    supabase
      .from("folders")
      .select("*")
      .eq("user_id", user.id)
      .eq("parent_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("files")
      .select("*")
      .eq("user_id", user.id)
      .eq("folder_id", id)
      .order("uploaded_at", { ascending: false }),
  ]);

  return (
    <FileManager
      initialFolders={folders ?? []}
      initialFiles={files ?? []}
      currentFolderId={id}
      userId={user.id}
      breadcrumbs={breadcrumbs}
    />
  );
}
