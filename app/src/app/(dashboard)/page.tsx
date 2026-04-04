import { createClient } from "@/lib/supabase/server";
import FileManager from "@/components/FileManager";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: folders } = await supabase
    .from("folders")
    .select("*")
    .eq("user_id", user.id)
    .is("parent_id", null)
    .order("created_at", { ascending: false });

  const { data: files } = await supabase
    .from("files")
    .select("*")
    .eq("user_id", user.id)
    .is("folder_id", null)
    .order("uploaded_at", { ascending: false });

  return (
    <div className="p-6">
      <FileManager
        initialFolders={folders ?? []}
        initialFiles={files ?? []}
        currentFolderId={null}
        userId={user.id}
      />
    </div>
  );
}
