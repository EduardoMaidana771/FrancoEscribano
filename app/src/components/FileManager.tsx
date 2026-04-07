"use client";

import { useState, useCallback } from "react";
import type { DragEvent, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type {
  Folder,
  FileRecord,
  ExtractedTextData,
  ExtractedVehicleData,
} from "@/lib/types";
import {
  FolderPlus,
  Upload,
  Folder as FolderIcon,
  FileText,
  Image as ImageIcon,
  FileIcon,
  Trash2,
  ArrowLeft,
  Scan,
  X,
  Copy,
  Check,
  Loader2,
  FileSearch,
  ArrowRight,
} from "lucide-react";

interface FileManagerProps {
  initialFolders: Folder[];
  initialFiles: FileRecord[];
  currentFolderId: string | null;
  userId: string;
  breadcrumbs?: { id: string | null; name: string }[];
}

type ExtractResultType = "cedula" | "libreta" | "cached" | "text";

interface ExtractResultState {
  fileId: string;
  fileName: string;
  type: ExtractResultType;
  data: Record<string, unknown>;
}

type ExtractedTextPerson = NonNullable<ExtractedTextData["persons"]>[number];
type ExtractedTransactionData = NonNullable<ExtractedTextData["transaction"]>;

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
  const [extractResult, setExtractResult] = useState<ExtractResultState | null>(null);
  const [extractError, setExtractError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textTitle, setTextTitle] = useState("");
  const [manualText, setManualText] = useState("");
  const [extractingText, setExtractingText] = useState(false);
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

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

  const normalizeRole = (role: string | undefined) =>
    (role ?? "").trim().toLowerCase();

  const isMeaningfulValue = (value: unknown) => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim().length > 0;
    return true;
  };

  const setIfMeaningful = (
    target: Record<string, unknown>,
    key: string,
    value: unknown
  ) => {
    if (isMeaningfulValue(value)) target[key] = value;
  };

  const mergeIntoPrefill = (
    target: Record<string, unknown>,
    source: Record<string, unknown>
  ) => {
    for (const [key, value] of Object.entries(source)) {
      if (!isMeaningfulValue(value)) continue;
      if (!isMeaningfulValue(target[key])) target[key] = value;
    }
  };

  const normalizeTaxStatus = (value: unknown) => {
    const status = typeof value === "string" ? value.trim().toLowerCase() : "";
    if (status === "si" || status === "no" || status === "no_controlado") return status;
    return undefined;
  };

  const normalizePaymentType = (value: unknown) => {
    const paymentType = typeof value === "string" ? value.trim().toLowerCase() : "";
    const allowed = [
      "contado",
      "saldo_precio",
      "transferencia_bancaria",
      "letra_cambio",
      "mixto",
      "cesion_tercero",
    ];
    return allowed.includes(paymentType) ? paymentType : undefined;
  };

  const normalizeTextFileName = (value: string) => {
    const base = value
      .trim()
      .replace(/[^a-zA-Z0-9._\-\s]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 80);
    const fallback = `texto_${new Date().toISOString().replace(/[:.]/g, "-")}`;
    const safeBase = base || fallback;
    return safeBase.toLowerCase().endsWith(".txt") ? safeBase : `${safeBase}.txt`;
  };

  const applyPersonToPrefill = (
    prefill: Record<string, unknown>,
    prefix: "seller" | "seller2" | "buyer" | "buyer2",
    person: ExtractedTextPerson
  ) => {
    if (prefix === "seller2") prefill.has_seller2 = true;
    if (prefix === "buyer2") prefill.has_buyer2 = true;
    const isPrimaryParty = prefix === "seller" || prefix === "buyer";

    setIfMeaningful(prefill, `${prefix}_full_name`, person.full_name);
    setIfMeaningful(prefill, `${prefix}_ci`, person.ci_number);
    setIfMeaningful(prefill, `${prefix}_nationality`, person.nationality);
    setIfMeaningful(prefill, `${prefix}_birth_date`, person.birth_date);
    setIfMeaningful(prefill, `${prefix}_birth_place`, person.birth_place);
    setIfMeaningful(prefill, `${prefix}_civil_status`, person.civil_status);
    setIfMeaningful(prefill, `${prefix}_civil_status_detail`, person.civil_status_detail);
    setIfMeaningful(prefill, `${prefix}_address`, person.address);
    setIfMeaningful(prefill, `${prefix}_department`, person.department);

    if (isPrimaryParty) {
      setIfMeaningful(prefill, `${prefix}_phone`, person.phone);
      setIfMeaningful(prefill, `${prefix}_spouse_name`, person.spouse_name);
      if (typeof person.is_company === "boolean") {
        prefill[`${prefix}_is_company`] = person.is_company;
      }
      setIfMeaningful(prefill, `${prefix}_company_name`, person.company_name);
      setIfMeaningful(prefill, `${prefix}_company_type`, person.company_type);
      setIfMeaningful(prefill, `${prefix}_rut`, person.rut);
    }
  };

  const applyVehicleToPrefill = (
    prefill: Record<string, unknown>,
    vehicle: ExtractedVehicleData
  ) => {
    if (vehicle.brand) prefill.vehicle_brand = vehicle.brand;
    if (vehicle.model) prefill.vehicle_model = vehicle.model;
    if (vehicle.year !== undefined && vehicle.year !== null) {
      prefill.vehicle_year = String(vehicle.year);
    }
    if (vehicle.type) prefill.vehicle_type = vehicle.type;
    if (vehicle.fuel) prefill.vehicle_fuel = vehicle.fuel;
    if (vehicle.cylinders !== undefined && vehicle.cylinders !== null) {
      prefill.vehicle_cylinders = String(vehicle.cylinders);
    }
    if (vehicle.motor_number) prefill.vehicle_motor_number = vehicle.motor_number;
    if (vehicle.chassis_number) prefill.vehicle_chassis_number = vehicle.chassis_number;
    if (vehicle.plate) prefill.vehicle_plate = vehicle.plate;
    if (vehicle.padron) prefill.vehicle_padron = vehicle.padron;
    if (vehicle.padron_department) {
      prefill.vehicle_padron_department = vehicle.padron_department;
    }
    if (vehicle.owner_name) prefill.vehicle_owner_name = vehicle.owner_name;
    if (vehicle.owner_ci) prefill.vehicle_owner_ci = vehicle.owner_ci;
  };

  const applyPriceToPrefill = (
    prefill: Record<string, unknown>,
    price: ExtractedTextData["price"]
  ) => {
    if (!price) return;
    if (price.amount !== undefined && price.amount !== null) {
      prefill.price_amount = String(price.amount);
    }
    if (price.currency) prefill.price_currency = price.currency;
    if (price.in_words) prefill.price_in_words = price.in_words;
  };

  const applyTransactionToPrefill = (
    prefill: Record<string, unknown>,
    transaction: ExtractedTextData["transaction"]
  ) => {
    if (!transaction) return;
    setIfMeaningful(prefill, "transaction_date", transaction.transaction_date);
    setIfMeaningful(prefill, "payment_type", normalizePaymentType(transaction.payment_type));
    setIfMeaningful(prefill, "payment_detail", transaction.payment_detail);
    setIfMeaningful(prefill, "bps_status", normalizeTaxStatus(transaction.bps_status));
    setIfMeaningful(prefill, "irae_status", normalizeTaxStatus(transaction.irae_status));
    setIfMeaningful(prefill, "imeba_status", normalizeTaxStatus(transaction.imeba_status));
    setIfMeaningful(prefill, "previous_owner_name", transaction.previous_owner_name);
    setIfMeaningful(prefill, "previous_title_date", transaction.previous_title_date);
    setIfMeaningful(prefill, "previous_title_notary", transaction.previous_title_notary);
  };

  const navigateToForm = (prefill: Record<string, unknown>) => {
    sessionStorage.setItem("prefill_compraventa", JSON.stringify(prefill));
    router.push("/compraventa/nueva");
  };

  const buildPrefillDataFromText = (data: Record<string, unknown>) => {
    const prefill: Record<string, unknown> = {};
    const extracted = data as ExtractedTextData;
    const persons = Array.isArray(extracted.persons) ? extracted.persons : [];
    const vehicles = Array.isArray(extracted.vehicles) ? extracted.vehicles : [];
    const remaining = [...persons];

    const takePerson = (role: string) => {
      const index = remaining.findIndex(
        (person) => normalizeRole(person.role) === normalizeRole(role)
      );
      if (index === -1) return null;
      const [person] = remaining.splice(index, 1);
      return person;
    };

    const seller = takePerson("vendedor") ?? remaining.shift() ?? null;
    const buyer = takePerson("comprador") ?? remaining.shift() ?? null;
    const seller2 = remaining.shift() ?? null;
    const buyer2 = remaining.shift() ?? null;

    if (seller) applyPersonToPrefill(prefill, "seller", seller);
    if (buyer) applyPersonToPrefill(prefill, "buyer", buyer);
    if (seller2) applyPersonToPrefill(prefill, "seller2", seller2);
    if (buyer2) applyPersonToPrefill(prefill, "buyer2", buyer2);
    if (vehicles[0]) {
      const vehicle = vehicles[0] as ExtractedVehicleData & Record<string, unknown>;
      applyVehicleToPrefill(prefill, vehicle);
      setIfMeaningful(prefill, "vehicle_national_code", vehicle.national_code);
      setIfMeaningful(prefill, "vehicle_affectation", vehicle.affectation);
    }
    applyPriceToPrefill(prefill, extracted.price);
    applyTransactionToPrefill(prefill, extracted.transaction as ExtractedTransactionData);

    return prefill;
  };

  const buildPrefillDataFromResult = (result: ExtractResultState) => {
    if (
      result.type === "text" ||
      Array.isArray(result.data.persons) ||
      Array.isArray(result.data.vehicles)
    ) {
      return buildPrefillDataFromText(result.data);
    }

    const prefill: Record<string, unknown> = {};
    const flatData = result.data as ExtractedTextPerson & ExtractedVehicleData;

    if (result.type === "libreta" || flatData.brand || flatData.plate || flatData.padron) {
      applyVehicleToPrefill(prefill, flatData);
    }

    if (result.type !== "libreta") {
      applyPersonToPrefill(prefill, "seller", flatData);
    }

    return prefill;
  };

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

  const extractManualText = async () => {
    if (!manualText.trim()) {
      setExtractError("Pegá un texto para extraer datos.");
      return;
    }

    setExtractingText(true);
    setExtractError("");
    setExtractResult(null);

    try {
      const normalizedName = normalizeTextFileName(textTitle || "texto_manual");
      const textBlob = new Blob([manualText.trim()], {
        type: "text/plain;charset=utf-8",
      });
      const filePath = `${userId}/${currentFolderId ?? "root"}/${Date.now()}_${normalizedName}`;

      const { error: storageError } = await supabase.storage
        .from("documents")
        .upload(filePath, textBlob);

      if (storageError) {
        throw new Error("No se pudo guardar el texto en archivos");
      }

      const { data: createdFile, error: dbError } = await supabase
        .from("files")
        .insert({
          user_id: userId,
          folder_id: currentFolderId,
          file_name: normalizedName,
          file_path: filePath,
          file_type: "text/plain",
          file_size: textBlob.size,
        })
        .select()
        .single();

      if (dbError || !createdFile) {
        throw new Error("No se pudo registrar el texto en la base de datos");
      }

      setFiles((prev) => [createdFile, ...prev]);

      const formData = new FormData();
      formData.append("type", "text");
      formData.append("text", manualText.trim());
      formData.append("fileId", createdFile.id);

      const res = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error en la extracción");
      }

      const { data } = await res.json();

      setFiles((prev) =>
        prev.map((file) =>
          file.id === createdFile.id ? { ...file, extracted_data: data } : file
        )
      );

      setExtractResult({
        fileId: createdFile.id,
        fileName: createdFile.file_name,
        type: "text",
        data,
      });
      setShowTextInput(false);
      setTextTitle("");
      setManualText("");
    } catch (err) {
      setExtractError(
        err instanceof Error ? err.message : "Error al extraer datos desde texto"
      );
    } finally {
      setExtractingText(false);
    }
  };

  const extractData = async (
    fileRecord: FileRecord,
    type: "cedula" | "libreta" | "auto"
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

      const json = await res.json();
      if (json.type === "unknown") {
        throw new Error("No se pudo clasificar el documento para extracción automática");
      }
      const data = json.data as Record<string, unknown>;
      const responseType = json.type as string;
      const normalizedType: ExtractResultType =
        responseType === "cedula" || responseType === "libreta" || responseType === "text"
          ? responseType
          : type === "auto"
            ? "text"
            : type;

      // Update local file state with extracted_data
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileRecord.id ? { ...f, extracted_data: data } : f
        )
      );

      setExtractResult({
        fileId: fileRecord.id,
        fileName: fileRecord.file_name,
        type: normalizedType,
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
    const textResults = bulkResults.filter((r) => r.type === "text");

    // Map persons by role
    for (let i = 0; i < persons.length; i++) {
      const role = personRoles[i];
      if (!role || role === "ignorar") continue;

      const d = persons[i].data;
      let prefix: "seller" | "seller2" | "buyer" | "buyer2";
      if (role === "vendedor") prefix = "seller";
      else if (role === "comprador") prefix = "buyer";
      else if (role === "co_vendedor") { prefix = "seller2"; prefill.has_seller2 = true; }
      else if (role === "co_comprador") { prefix = "buyer2"; prefill.has_buyer2 = true; }
      else continue;

      applyPersonToPrefill(prefill, prefix, d as ExtractedTextPerson);
    }

    // Map first vehicle
    if (vehicles.length > 0) {
      const v = vehicles[0].data as ExtractedVehicleData & Record<string, unknown>;
      applyVehicleToPrefill(prefill, v);
      if (v.national_code) prefill.vehicle_national_code = v.national_code;
      if (v.affectation) prefill.vehicle_affectation = v.affectation;
    }

    for (const textResult of textResults) {
      mergeIntoPrefill(prefill, buildPrefillDataFromText(textResult.data));
    }

    return prefill;
  }

  function handleContinueToForm() {
    navigateToForm(buildPrefillData());
  }

  function handleContinueFromExtractResult() {
    if (!extractResult) return;
    navigateToForm(buildPrefillDataFromResult(extractResult));
  }

  const roleOptions = [
    { value: "vendedor", label: "Vendedor" },
    { value: "comprador", label: "Comprador" },
    { value: "co_vendedor", label: "Co-vendedor (cónyuge)" },
    { value: "co_comprador", label: "Co-comprador (cónyuge)" },
    { value: "ignorar", label: "Ignorar" },
  ];

  function isExtractableFile(type: string | null) {
    return (type?.startsWith("image/") || type === "application/pdf" || isWordFile(type)) ?? false;
  }

  function isWordFile(type: string | null) {
    return (
      type === "application/msword" ||
      type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  }

  function formatExtractedLabel(key: string): string {
    const labels: Record<string, string> = {
      full_name: "Nombre completo",
      ci_number: "Cédula",
      nationality: "Nacionalidad",
      birth_date: "Fecha nacimiento",
      birth_place: "Lugar nacimiento",
      civil_status: "Estado civil",
      civil_status_detail: "Detalle estado civil",
      spouse_name: "Cónyuge",
      is_company: "Es empresa",
      company_name: "Razón social",
      company_type: "Tipo de sociedad",
      rut: "RUT",
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
      transaction_date: "Fecha compraventa",
      payment_type: "Forma de pago",
      payment_detail: "Detalle de pago",
      bps_status: "BPS",
      irae_status: "IRAE",
      imeba_status: "IMEBA",
      previous_owner_name: "Titular anterior",
      previous_title_date: "Fecha título anterior",
      previous_title_notary: "Escribano título anterior",
      phone: "Teléfono",
    };
    return labels[key] || key;
  }

  const handleDrop = useCallback(
    (e: DragEvent) => {
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
      return <ImageIcon size={20} className="text-green-500" />;
    if (type.includes("pdf"))
      return <FileText size={20} className="text-red-500" />;
    if (isWordFile(type))
      return <FileText size={20} className="text-blue-600" />;
    return <FileIcon size={20} className="text-blue-500" />;
  }

  function renderValue(value: unknown, depth = 0): ReactNode {
    if (value === null || value === undefined || value === "") return null;

    if (Array.isArray(value)) {
      return (
        <div className="space-y-2">
          {value.map((item, index) => (
            <div key={`${depth}-${index}`} className="rounded-md border border-gray-200 bg-gray-50 p-3">
              {isRecord(item) ? (
                <div className="space-y-1.5">
                  {Object.entries(item)
                    .filter(([, nestedValue]) => nestedValue !== null && nestedValue !== undefined && nestedValue !== "")
                    .map(([nestedKey, nestedValue]) => (
                      <div key={nestedKey} className="flex items-baseline gap-2 text-sm">
                        <span className="min-w-[120px] text-xs text-gray-500">
                          {formatExtractedLabel(nestedKey)}:
                        </span>
                        <div className="font-medium text-gray-800">{renderValue(nestedValue, depth + 1)}</div>
                      </div>
                    ))}
                </div>
              ) : (
                <span className="text-sm font-medium text-gray-800">{String(item)}</span>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (isRecord(value)) {
      return (
        <div className="space-y-1.5 rounded-md border border-gray-200 bg-gray-50 p-3">
          {Object.entries(value)
            .filter(([, nestedValue]) => nestedValue !== null && nestedValue !== undefined && nestedValue !== "")
            .map(([nestedKey, nestedValue]) => (
              <div key={nestedKey} className="flex items-baseline gap-2 text-sm">
                <span className="min-w-[120px] text-xs text-gray-500">
                  {formatExtractedLabel(nestedKey)}:
                </span>
                <div className="font-medium text-gray-800">{renderValue(nestedValue, depth + 1)}</div>
              </div>
            ))}
        </div>
      );
    }

    return <span className="font-medium text-gray-800">{String(value)}</span>;
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
          <button
            onClick={() => setShowTextInput((prev) => !prev)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
          >
            <FileText size={16} />
            Pegar texto
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

      {showTextInput && (
        <div className="mb-4 rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Extraer desde texto</h3>
              <p className="mt-1 text-xs text-gray-500">
                Pegá un mensaje, correo o resumen de la operación. Se procesa igual que el modo texto del extractor.
              </p>
            </div>
            <button
              onClick={() => setShowTextInput(false)}
              className="rounded p-1 hover:bg-gray-100"
            >
              <X size={16} className="text-gray-500" />
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            <input
              type="text"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              placeholder="Nombre opcional para identificar este texto"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Ej: Vendedor Juan Pérez CI..., comprador María..., vehículo Toyota Corolla matrícula..."
              rows={8}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                Este texto se guarda como archivo .txt dentro de la carpeta actual y queda disponible como respaldo.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowTextInput(false);
                    setTextTitle("");
                    setManualText("");
                  }}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={extractManualText}
                  disabled={extractingText || !manualText.trim()}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {extractingText ? <Loader2 size={16} className="animate-spin" /> : <Scan size={16} />}
                  Extraer datos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  {isWordFile(file.file_type) && (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                      Word
                    </span>
                  )}
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
                        {isWordFile(file.file_type) ? (
                          <button
                            onClick={() => extractData(file, "auto")}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-1.5 py-0.5 rounded hover:bg-blue-50"
                            title="Extraer texto del documento Word"
                          >
                            <Scan size={13} />
                            Texto
                          </button>
                        ) : (
                          <>
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
                          </>
                        )}
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
              Fotos, PDFs, documentos Word o texto pegado manualmente
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
                onClick={handleContinueFromExtractResult}
                className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
              >
                Continuar a compraventa
                <ArrowRight size={13} />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(extractResult.data)
                .filter(([, v]) => v !== null && v !== undefined && v !== "")
                .map(([key, value]) => (
                  <div
                    key={key}
                    className={Array.isArray(value) || isRecord(value) ? "md:col-span-2" : "flex items-baseline gap-2 text-sm"}
                  >
                    <span className="text-gray-500 min-w-[120px] text-xs">
                      {formatExtractedLabel(key)}:
                    </span>
                    <div className="flex-1">{renderValue(value)}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
