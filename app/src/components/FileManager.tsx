"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Folder, FileRecord } from "@/lib/types";
import {
  FolderPlus,
  Upload,
  Folder as FolderIcon,
  FileText,
  Image,
  FileIcon,
  Trash2,
  ArrowLeft,
  Scan,
  X,
  Copy,
  Check,
  Loader2,
  FileSearch,
  ChevronDown,
  ArrowRight,
} from "lucide-react";

interface FileManagerProps {
  initialFolders: Folder[];
  initialFiles: FileRecord[];
  currentFolderId: string | null;
  userId: string;
  breadcrumbs?: { id: string | null; name: string }[];
}

export default function FileManager({
  initialFolders,
  initialFiles,
  currentFolderId,
  userId,
  breadcrumbs = [{ id: null, name: "Mis Archivos" }],
}: FileManagerProps) {
  const [folders, setFolders] = useState(initialFolders);
  const [files, setFiles] = useState(initialFiles);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [extracting, setExtracting] = useState<string | null>(null);
  const [extractResult, setExtractResult] = useState<{
    fileId: string;
    fileName: string;
    type: string;
    data: Record<string, unknown>;
  } | null>(null);
  const [extractError, setExtractError] = useState("");
  const [copied, setCopied] = useState(false);
  // Bulk extraction state
  const [bulkPhase, setBulkPhase] = useState<"idle" | "extracting" | "assign">("idle");
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, fileName: "" });
  const [bulkResults, setBulkResults] = useState<
    { fileId: string; fileName: string; type: string; data: Record<string, unknown> }[]
  >([]);
  const [bulkError, setBulkError] = useState("");
  // Role assignment state: index into bulkResults persons → role
  const [personRoles, setPersonRoles] = useState<Record<number, string>>({});
  const supabase = createClient();
  const router = useRouter();

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    const { data, error } = await supabase
      .from("folders")
      .insert({
        user_id: userId,
        name: newFolderName.trim(),
        parent_id: currentFolderId,
      })
      .select()
      .single();

    if (!error && data) {
      setFolders((prev) => [data, ...prev]);
      setNewFolderName("");
      setShowNewFolder(false);
    }
  };

  const deleteFolder = async (folderId: string) => {
    await supabase.from("folders").delete().eq("id", folderId);
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
  };

  const uploadFiles = useCallback(
    async (fileList: FileList) => {
      setUploading(true);
      for (const file of Array.from(fileList)) {
        const filePath = `${userId}/${currentFolderId ?? "root"}/${Date.now()}_${file.name}`;

        const { error: storageError } = await supabase.storage
          .from("documents")
          .upload(filePath, file);

        if (storageError) {
          console.error("Upload error:", storageError);
          continue;
        }

        const { data, error: dbError } = await supabase
          .from("files")
          .insert({
            user_id: userId,
            folder_id: currentFolderId,
            file_name: file.name,
            file_path: filePath,
            file_type: file.type,
            file_size: file.size,
          })
          .select()
          .single();

        if (!dbError && data) {
          setFiles((prev) => [data, ...prev]);
        }
      }
      setUploading(false);
    },
    [supabase, userId, currentFolderId]
  );

  const deleteFile = async (fileRecord: FileRecord) => {
    await supabase.storage.from("documents").remove([fileRecord.file_path]);
    await supabase.from("files").delete().eq("id", fileRecord.id);
    setFiles((prev) => prev.filter((f) => f.id !== fileRecord.id));
  };

  const extractData = async (
    fileRecord: FileRecord,
    type: "cedula" | "libreta"
  ) => {
    setExtracting(fileRecord.id);
    setExtractError("");
    setExtractResult(null);

    try {
      // Download file from Supabase Storage
      const { data: blob, error: dlErr } = await supabase.storage
        .from("documents")
        .download(fileRecord.file_path);

      if (dlErr || !blob) throw new Error("Error al descargar archivo");

      const formData = new FormData();
      formData.append("type", type);
      formData.append("file", blob, fileRecord.file_name);
      formData.append("fileId", fileRecord.id);

      const res = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error en la extracción");
      }

      const { data } = await res.json();

      // Update local file state with extracted_data
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileRecord.id ? { ...f, extracted_data: data } : f
        )
      );

      setExtractResult({
        fileId: fileRecord.id,
        fileName: fileRecord.file_name,
        type,
        data,
      });
    } catch (err) {
      setExtractError(
        err instanceof Error ? err.message : "Error al extraer datos"
      );
    } finally {
      setExtracting(null);
    }
  };

  const copyToClipboard = async (data: Record<string, unknown>) => {
    const text = JSON.stringify(data, null, 2);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const imageFiles = files.filter((f) => isImageFile(f.file_type));
  const extractableFiles = files.filter((f) => isExtractableFile(f.file_type));
  const hasExtractableFiles = extractableFiles.length > 0;

  async function bulkExtract() {
    const targets = extractableFiles;
    setBulkPhase("extracting");
    setBulkError("");
    setBulkResults([]);
    setPersonRoles({});
    const results: typeof bulkResults = [];

    for (let i = 0; i < targets.length; i++) {
      const file = targets[i];
      setBulkProgress({ current: i + 1, total: targets.length, fileName: file.file_name });

      // Use cached data if available
      if (file.extracted_data) {
        const cached = file.extracted_data as Record<string, unknown>;
        const detectedType = cached.brand || cached.plate ? "libreta" : "cedula";
        results.push({ fileId: file.id, fileName: file.file_name, type: detectedType, data: cached });
        continue;
      }

      try {
        const { data: blob, error: dlErr } = await supabase.storage
          .from("documents")
          .download(file.file_path);
        if (dlErr || !blob) throw new Error("Error al descargar");

        const fd = new FormData();
        fd.append("type", "auto");
        fd.append("file", blob, file.file_name);
        fd.append("fileId", file.id);

        // Fetch with retry for 429/502
        let res: Response | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          res = await fetch("/api/extract", { method: "POST", body: fd });
          if (res.ok || (res.status !== 429 && res.status !== 502)) break;
          const waitSec = Math.pow(2, attempt + 1) * 5;
          setBulkProgress({ current: i + 1, total: targets.length, fileName: `Reintentando ${file.file_name} en ${waitSec}s...` });
          await new Promise((r) => setTimeout(r, waitSec * 1000));
        }
        if (!res || !res.ok) {
          const err = res ? await res.json() : { error: "Sin respuesta" };
          throw new Error(err.error || "Error en extracción");
        }

        const json = await res.json();
        if (json.type === "unknown") {
          // Couldn't classify — skip with note
          results.push({ fileId: file.id, fileName: file.file_name, type: "unknown", data: {} });
          continue;
        }

        // Update local state
        setFiles((prev) =>
          prev.map((f) => (f.id === file.id ? { ...f, extracted_data: json.data } : f))
        );
        results.push({ fileId: file.id, fileName: file.file_name, type: json.type, data: json.data });
      } catch (err) {
        results.push({
          fileId: file.id,
          fileName: file.file_name,
          type: "error",
          data: { _error: err instanceof Error ? err.message : "Error desconocido" },
        });
      }
    }

    setBulkResults(results);
    // Auto-assign first person as seller, second as buyer
    const persons = results.filter((r) => r.type === "cedula");
    const roles: Record<number, string> = {};
    persons.forEach((_, i) => {
      if (i === 0) roles[i] = "vendedor";
      else if (i === 1) roles[i] = "comprador";
      else roles[i] = "ignorar";
    });
    setPersonRoles(roles);
    setBulkPhase("assign");
  }

  function buildPrefillData(): Record<string, unknown> {
    const prefill: Record<string, unknown> = {};
    const persons = bulkResults.filter((r) => r.type === "cedula");
    const vehicles = bulkResults.filter((r) => r.type === "libreta");

    // Map persons by role
    for (let i = 0; i < persons.length; i++) {
      const role = personRoles[i];
      if (!role || role === "ignorar") continue;

      const d = persons[i].data;
      let prefix: string;
      if (role === "vendedor") prefix = "seller";
      else if (role === "comprador") prefix = "buyer";
      else if (role === "co_vendedor") { prefix = "seller2"; prefill.has_seller2 = true; }
      else if (role === "co_comprador") { prefix = "buyer2"; prefill.has_buyer2 = true; }
      else continue;

      if (d.full_name) prefill[`${prefix}_full_name`] = d.full_name;
      if (d.ci_number) prefill[`${prefix}_ci`] = d.ci_number;
      if (d.nationality) prefill[`${prefix}_nationality`] = d.nationality;
      if (d.birth_date) prefill[`${prefix}_birth_date`] = d.birth_date;
      if (d.birth_place) prefill[`${prefix}_birth_place`] = d.birth_place;
      if (d.civil_status) prefill[`${prefix}_civil_status`] = d.civil_status;
      if (d.address) prefill[`${prefix}_address`] = d.address;
      if (d.department) prefill[`${prefix}_department`] = d.department;
    }

    // Map first vehicle
    if (vehicles.length > 0) {
      const v = vehicles[0].data;
      if (v.brand) prefill.vehicle_brand = v.brand;
      if (v.model) prefill.vehicle_model = v.model;
      if (v.year) prefill.vehicle_year = String(v.year);
      if (v.type) prefill.vehicle_type = v.type;
      if (v.fuel) prefill.vehicle_fuel = v.fuel;
      if (v.cylinders) prefill.vehicle_cylinders = String(v.cylinders);
      if (v.motor_number) prefill.vehicle_motor_number = v.motor_number;
      if (v.chassis_number) prefill.vehicle_chassis_number = v.chassis_number;
      if (v.plate) prefill.vehicle_plate = v.plate;
      if (v.padron) prefill.vehicle_padron = v.padron;
      if (v.padron_department) prefill.vehicle_padron_department = v.padron_department;
      if (v.national_code) prefill.vehicle_national_code = v.national_code;
      if (v.affectation) prefill.vehicle_affectation = v.affectation;
      if (v.owner_name) prefill.vehicle_owner_name = v.owner_name;
      if (v.owner_ci) prefill.vehicle_owner_ci = v.owner_ci;
    }

    return prefill;
  }

  function handleContinueToForm() {
    const prefill = buildPrefillData();
    sessionStorage.setItem("prefill_compraventa", JSON.stringify(prefill));
    router.push("/compraventa/nueva");
  }

  const roleOptions = [
    { value: "vendedor", label: "Vendedor" },
    { value: "comprador", label: "Comprador" },
    { value: "co_vendedor", label: "Co-vendedor (cónyuge)" },
    { value: "co_comprador", label: "Co-comprador (cónyuge)" },
    { value: "ignorar", label: "Ignorar" },
  ];

  function isImageFile(type: string | null) {
    return type?.startsWith("image/") ?? false;
  }

  function isExtractableFile(type: string | null) {
    return (type?.startsWith("image/") || type === "application/pdf") ?? false;
  }

  function formatExtractedLabel(key: string): string {
    const labels: Record<string, string> = {
      full_name: "Nombre completo",
      ci_number: "Cédula",
      nationality: "Nacionalidad",
      birth_date: "Fecha nacimiento",
      birth_place: "Lugar nacimiento",
      civil_status: "Estado civil",
      address: "Domicilio",
      department: "Departamento",
      brand: "Marca",
      model: "Modelo",
      year: "Año",
      type: "Tipo",
      fuel: "Combustible",
      cylinders: "Cilindrada",
      motor_number: "N° Motor",
      chassis_number: "N° Chasis",
      plate: "Matrícula",
      padron: "Padrón",
      padron_department: "Depto. Padrón",
      national_code: "Código Nacional",
      affectation: "Afectación",
      owner_name: "Titular",
      owner_ci: "CI Titular",
      phone: "Teléfono",
    };
    return labels[key] || key;
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files);
      }
    },
    [uploadFiles]
  );

  function getFileIcon(type: string | null) {
    if (!type) return <FileIcon size={20} className="text-gray-400" />;
    if (type.startsWith("image/"))
      return <Image size={20} className="text-green-500" />;
    if (type.includes("pdf"))
      return <FileText size={20} className="text-red-500" />;
    return <FileIcon size={20} className="text-blue-500" />;
  }

  function formatSize(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {breadcrumbs.length > 1 && (
            <button
              onClick={() => {
                const parent = breadcrumbs[breadcrumbs.length - 2];
                router.push(parent.id ? `/carpeta/${parent.id}` : "/archivos");
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="flex items-center gap-1 text-sm">
            {breadcrumbs.map((bc, i) => (
              <span key={bc.id ?? "root"} className="flex items-center gap-1">
                {i > 0 && <span className="text-gray-400">/</span>}
                <span
                  className={
                    i === breadcrumbs.length - 1
                      ? "font-semibold text-gray-900"
                      : "text-gray-500"
                  }
                >
                  {bc.name}
                </span>
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasExtractableFiles && currentFolderId && (
            <button
              onClick={bulkExtract}
              disabled={bulkPhase === "extracting"}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <FileSearch size={16} />
              Generar compraventa
            </button>
          )}
          <button
            onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
          >
            <FolderPlus size={16} />
            Nueva carpeta
          </button>
          <label className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors">
            <Upload size={16} />
            Subir archivos
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) uploadFiles(e.target.files);
              }}
            />
          </label>
        </div>
      </div>

      {/* New folder input */}
      {showNewFolder && (
        <div className="flex items-center gap-2 mb-4 bg-white p-3 rounded-lg border">
          <FolderIcon size={20} className="text-yellow-500" />
          <input
            autoFocus
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createFolder();
              if (e.key === "Escape") setShowNewFolder(false);
            }}
            placeholder="Nombre de la carpeta (ej: FIAT-STRADA-OAE7011)"
            className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={createFolder}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Crear
          </button>
          <button
            onClick={() => setShowNewFolder(false)}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`min-h-[400px] rounded-lg border-2 border-dashed transition-colors ${
          dragOver
            ? "border-blue-400 bg-blue-50"
            : "border-gray-200 bg-white"
        }`}
      >
        {uploading && (
          <div className="p-3 text-sm text-blue-600 bg-blue-50 rounded-t-lg">
            Subiendo archivos...
          </div>
        )}

        {/* Folders */}
        {folders.length > 0 && (
          <div className="p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Carpetas
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="group relative bg-gray-50 hover:bg-gray-100 rounded-lg p-3 cursor-pointer transition-colors border border-transparent hover:border-gray-200"
                  onClick={() => router.push(`/carpeta/${folder.id}`)}
                >
                  <div className="flex items-center gap-2">
                    <FolderIcon
                      size={24}
                      className="text-yellow-500 flex-shrink-0"
                    />
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {folder.name}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFolder(folder.id);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
                  >
                    <Trash2 size={14} className="text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Files */}
        {files.length > 0 && (
          <div className="p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Archivos
            </h3>
            <div className="space-y-1">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="group flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-md transition-colors"
                >
                  {getFileIcon(file.file_type)}
                  <span className="flex-1 text-sm text-gray-800 truncate">
                    {file.file_name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatSize(file.file_size)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(file.uploaded_at).toLocaleDateString("es-UY")}
                  </span>
                  {file.extracted_data ? (
                    <button
                      onClick={() =>
                        setExtractResult({
                          fileId: file.id,
                          fileName: file.file_name,
                          type: "cached",
                          data: file.extracted_data as Record<string, unknown>,
                        })
                      }
                      className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full hover:bg-green-200 transition-colors cursor-pointer"
                    >
                      Procesado
                    </button>
                  ) : isExtractableFile(file.file_type) ? (
                    extracting === file.id ? (
                      <span className="flex items-center gap-1 text-xs text-blue-600">
                        <Loader2 size={14} className="animate-spin" />
                        Extrayendo...
                      </span>
                    ) : (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => extractData(file, "cedula")}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-1.5 py-0.5 rounded hover:bg-blue-50"
                          title="Extraer datos de cédula"
                        >
                          <Scan size={13} />
                          Cédula
                        </button>
                        <button
                          onClick={() => extractData(file, "libreta")}
                          className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 px-1.5 py-0.5 rounded hover:bg-purple-50"
                          title="Extraer datos de libreta"
                        >
                          <Scan size={13} />
                          Libreta
                        </button>
                      </div>
                    )
                  ) : null}
                  <button
                    onClick={() => deleteFile(file)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
                  >
                    <Trash2 size={14} className="text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {folders.length === 0 && files.length === 0 && !uploading && (
          <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
            <Upload size={48} className="mb-3" />
            <p className="text-lg font-medium">
              Arrastrá archivos aquí o usá el botón &ldquo;Subir archivos&rdquo;
            </p>
            <p className="text-sm mt-1">
              Fotos de cédula, libreta de propiedad, PDFs, texto
            </p>
          </div>
        )}
      </div>

      {/* Bulk extraction progress */}
      {bulkPhase === "extracting" && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Loader2 size={20} className="animate-spin text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                Extrayendo archivo {bulkProgress.current} de {bulkProgress.total}...
              </p>
              <p className="text-xs text-blue-600 mt-0.5">{bulkProgress.fileName}</p>
            </div>
          </div>
          <div className="mt-3 w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Bulk role assignment panel */}
      {bulkPhase === "assign" && bulkResults.length > 0 && (
        <div className="mt-4 bg-white border rounded-lg shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 rounded-t-lg">
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">Asignar roles</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Revisá los datos extraídos y asigná quién es vendedor y comprador
              </p>
            </div>
            <button
              onClick={() => { setBulkPhase("idle"); setBulkResults([]); }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <X size={16} className="text-gray-500" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Persons */}
            {bulkResults
              .filter((r) => r.type === "cedula")
              .map((person, idx) => (
                <div key={person.fileId} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        Persona
                      </span>
                      <span className="text-xs text-gray-500">{person.fileName}</span>
                    </div>
                    <select
                      value={personRoles[idx] ?? "ignorar"}
                      onChange={(e) =>
                        setPersonRoles((prev) => ({ ...prev, [idx]: e.target.value }))
                      }
                      className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {roleOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                    {Object.entries(person.data)
                      .filter(([, v]) => v !== null && v !== undefined && v !== "")
                      .map(([key, value]) => (
                        <div key={key} className="text-xs">
                          <span className="text-gray-500">{formatExtractedLabel(key)}: </span>
                          <span className="font-medium text-gray-800">{String(value)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}

            {/* Vehicles */}
            {bulkResults
              .filter((r) => r.type === "libreta")
              .map((vehicle) => (
                <div key={vehicle.fileId} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                      Vehículo
                    </span>
                    <span className="text-xs text-gray-500">{vehicle.fileName}</span>
                    <span className="text-xs text-green-600 ml-auto">Se asigna automáticamente</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                    {Object.entries(vehicle.data)
                      .filter(([, v]) => v !== null && v !== undefined && v !== "")
                      .map(([key, value]) => (
                        <div key={key} className="text-xs">
                          <span className="text-gray-500">{formatExtractedLabel(key)}: </span>
                          <span className="font-medium text-gray-800">{String(value)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}

            {/* Unknown / errors */}
            {bulkResults
              .filter((r) => r.type === "unknown" || r.type === "error")
              .map((item) => (
                <div key={item.fileId} className="border border-amber-200 rounded-lg p-3 bg-amber-50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      {item.type === "error" ? "Error" : "Omitido"}
                    </span>
                    <span className="text-xs text-gray-500">{item.fileName}</span>
                  </div>
                  {item.type === "unknown" && (
                    <p className="text-xs text-amber-700 mt-1">No es cédula ni libreta — no se puede extraer datos</p>
                  )}
                  {"_error" in item.data && (
                    <p className="text-xs text-red-600 mt-1">{String(item.data._error)}</p>
                  )}
                </div>
              ))}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t">
              <button
                onClick={() => { setBulkPhase("idle"); setBulkResults([]); }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleContinueToForm}
                disabled={
                  bulkResults.filter((r) => r.type === "cedula").length === 0 &&
                  bulkResults.filter((r) => r.type === "libreta").length === 0
                }
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Continuar a compraventa
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk error */}
      {bulkError && (
        <div className="mt-4 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{bulkError}</span>
          <button onClick={() => setBulkError("")}><X size={16} /></button>
        </div>
      )}

      {/* Extraction error */}
      {extractError && (
        <div className="mt-4 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{extractError}</span>
          <button onClick={() => setExtractError("")}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Extraction result panel */}
      {extractResult && (
        <div className="mt-4 bg-white border rounded-lg shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 rounded-t-lg">
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">
                Datos extraídos
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {extractResult.fileName}
                {extractResult.type !== "cached" && (
                  <span className="ml-1">
                    ({extractResult.type === "cedula" ? "Cédula" : "Libreta"})
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(extractResult.data)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {copied ? (
                  <>
                    <Check size={13} />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    Copiar al portapapeles
                  </>
                )}
              </button>
              <button
                onClick={() => setExtractResult(null)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.entries(extractResult.data)
                .filter(([, v]) => v !== null && v !== undefined && v !== "")
                .map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-baseline gap-2 text-sm"
                  >
                    <span className="text-gray-500 min-w-[120px] text-xs">
                      {formatExtractedLabel(key)}:
                    </span>
                    <span className="font-medium text-gray-800">
                      {String(value)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
