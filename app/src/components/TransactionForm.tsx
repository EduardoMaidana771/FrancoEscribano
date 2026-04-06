"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Client, Vehicle, Transaction } from "@/lib/types";
import { Save, ArrowLeftRight, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import DgrCombobox from "./DgrCombobox";

interface PlateHistoryEntry {
  department: string;
  padron: string;
  matricula: string;
  date: string;
}

interface FormData {
  // Seller
  seller_full_name: string;
  seller_ci: string;
  seller_nationality: string;
  seller_birth_date: string;
  seller_birth_place: string;
  seller_civil_status: string;
  seller_civil_status_detail: string;
  seller_nupcias_type: string;
  seller_spouse_name: string;
  seller_divorce_ficha: string;
  seller_divorce_year: string;
  seller_divorce_court: string;
  seller_address: string;
  seller_department: string;
  seller_phone: string;
  seller_is_company: boolean;
  seller_company_name: string;
  seller_company_type: string;
  seller_rut: string;
  seller_company_registry_number: string;
  seller_company_registry_folio: string;
  seller_company_registry_book: string;
  seller_company_business_purpose: string;
  seller_company_law_19484: boolean;
  seller_representative_name: string;
  seller_representative_ci: string;
  seller_representative_role: string;
  seller_representative_address: string;
  // Seller 2 (spouse co-seller)
  has_seller2: boolean;
  seller2_full_name: string;
  seller2_ci: string;
  seller2_nationality: string;
  seller2_birth_date: string;
  seller2_birth_place: string;
  seller2_civil_status: string;
  seller2_civil_status_detail: string;
  seller2_nupcias_type: string;
  seller2_address: string;
  seller2_department: string;
  // Seller representative (apoderado)
  seller_has_representative: boolean;
  seller_rep_name: string;
  seller_rep_ci: string;
  seller_rep_address: string;
  seller_rep_power_date: string;
  seller_rep_power_notary: string;
  seller_rep_power_protocol_date: string;
  seller_rep_power_type: string;
  seller_rep_can_substitute: boolean;
  // Buyer
  buyer_full_name: string;
  buyer_ci: string;
  buyer_nationality: string;
  buyer_birth_date: string;
  buyer_birth_place: string;
  buyer_civil_status: string;
  buyer_civil_status_detail: string;
  buyer_nupcias_type: string;
  buyer_spouse_name: string;
  buyer_divorce_ficha: string;
  buyer_divorce_year: string;
  buyer_divorce_court: string;
  buyer_address: string;
  buyer_department: string;
  buyer_phone: string;
  buyer_is_company: boolean;
  buyer_company_name: string;
  buyer_company_type: string;
  buyer_rut: string;
  buyer_company_registry_number: string;
  buyer_company_registry_folio: string;
  buyer_company_registry_book: string;
  buyer_company_business_purpose: string;
  buyer_company_law_19484: boolean;
  buyer_representative_name: string;
  buyer_representative_ci: string;
  buyer_representative_role: string;
  buyer_representative_address: string;
  // Buyer 2 (spouse co-buyer)
  has_buyer2: boolean;
  buyer2_full_name: string;
  buyer2_ci: string;
  buyer2_nationality: string;
  buyer2_birth_date: string;
  buyer2_birth_place: string;
  buyer2_civil_status: string;
  buyer2_civil_status_detail: string;
  buyer2_nupcias_type: string;
  buyer2_address: string;
  buyer2_department: string;
  // Buyer representative (apoderado)
  buyer_has_representative: boolean;
  buyer_rep_name: string;
  buyer_rep_ci: string;
  buyer_rep_address: string;
  buyer_rep_power_date: string;
  buyer_rep_power_notary: string;
  buyer_rep_power_protocol_date: string;
  buyer_rep_power_type: string;
  buyer_rep_can_substitute: boolean;
  // Vehicle
  vehicle_brand: string;
  vehicle_brand_dgr_id: string;
  vehicle_model: string;
  vehicle_model_dgr_id: string;
  vehicle_year: string;
  vehicle_type: string;
  vehicle_type_dgr_id: string;
  vehicle_fuel: string;
  vehicle_fuel_dgr_id: string;
  vehicle_cylinders: string;
  vehicle_motor_number: string;
  vehicle_chassis_number: string;
  vehicle_plate: string;
  vehicle_padron: string;
  vehicle_padron_department: string;
  vehicle_national_code: string;
  vehicle_affectation: string;
  vehicle_owner_name: string;
  vehicle_owner_ci: string;
  // Transaction
  price_amount: string;
  price_currency: string;
  price_in_words: string;
  payment_type: string;
  payment_detail: string;
  payment_installments_count: string;
  payment_installment_amount: string;
  payment_cash_amount: string;
  payment_bank_name: string;
  payment_third_party_name: string;
  payment_third_party_ci: string;
  // Tax
  bps_status: string;
  irae_status: string;
  imeba_status: string;
  bps_cert_number: string;
  bps_cert_date: string;
  cud_number: string;
  cud_date: string;
  // Previous title
  previous_owner_name: string;
  previous_title_date: string;
  previous_title_notary: string;
  previous_title_same_notary: boolean;
  previous_title_registry: string;
  previous_title_number: string;
  previous_title_registry_date: string;
  previous_title_type: string;
  previous_title_is_first_registration: boolean;
  // Insurance
  insurance_policy_number: string;
  insurance_company: string;
  insurance_expiry: string;
  insurance_separate_cert: boolean;
  // Plate history
  has_plate_history: boolean;
  plate_history_entries: PlateHistoryEntry[];
  // Extra clauses
  election_declaration: string;
  has_traffic_responsibility_clause: boolean;
  traffic_responsibility_date: string;
  // Date
  transaction_date: string;
  // Protocolización
  paper_series_proto: string;
  paper_number_proto: string;
  paper_series_testimony: string;
  paper_numbers_testimony: string;
}

const defaultForm: FormData = {
  seller_full_name: "",
  seller_ci: "",
  seller_nationality: "uruguaya",
  seller_birth_date: "",
  seller_birth_place: "",
  seller_civil_status: "soltero",
  seller_civil_status_detail: "",
  seller_nupcias_type: "",
  seller_spouse_name: "",
  seller_divorce_ficha: "",
  seller_divorce_year: "",
  seller_divorce_court: "",
  seller_address: "",
  seller_department: "",
  seller_phone: "",
  seller_is_company: false,
  seller_company_name: "",
  seller_company_type: "",
  seller_rut: "",
  seller_company_registry_number: "",
  seller_company_registry_folio: "",
  seller_company_registry_book: "",
  seller_company_business_purpose: "",
  seller_company_law_19484: false,
  seller_representative_name: "",
  seller_representative_ci: "",
  seller_representative_role: "",
  seller_representative_address: "",
  has_seller2: false,
  seller2_full_name: "",
  seller2_ci: "",
  seller2_nationality: "uruguaya",
  seller2_birth_date: "",
  seller2_birth_place: "",
  seller2_civil_status: "casado",
  seller2_civil_status_detail: "",
  seller2_nupcias_type: "",
  seller2_address: "",
  seller2_department: "",
  seller_has_representative: false,
  seller_rep_name: "",
  seller_rep_ci: "",
  seller_rep_address: "",
  seller_rep_power_date: "",
  seller_rep_power_notary: "",
  seller_rep_power_protocol_date: "",
  seller_rep_power_type: "",
  seller_rep_can_substitute: false,
  buyer_full_name: "",
  buyer_ci: "",
  buyer_nationality: "uruguaya",
  buyer_birth_date: "",
  buyer_birth_place: "",
  buyer_civil_status: "soltero",
  buyer_civil_status_detail: "",
  buyer_nupcias_type: "",
  buyer_spouse_name: "",
  buyer_divorce_ficha: "",
  buyer_divorce_year: "",
  buyer_divorce_court: "",
  buyer_address: "",
  buyer_department: "",
  buyer_phone: "",
  buyer_is_company: false,
  buyer_company_name: "",
  buyer_company_type: "",
  buyer_rut: "",
  buyer_company_registry_number: "",
  buyer_company_registry_folio: "",
  buyer_company_registry_book: "",
  buyer_company_business_purpose: "",
  buyer_company_law_19484: false,
  buyer_representative_name: "",
  buyer_representative_ci: "",
  buyer_representative_role: "",
  buyer_representative_address: "",
  has_buyer2: false,
  buyer2_full_name: "",
  buyer2_ci: "",
  buyer2_nationality: "uruguaya",
  buyer2_birth_date: "",
  buyer2_birth_place: "",
  buyer2_civil_status: "casado",
  buyer2_civil_status_detail: "",
  buyer2_nupcias_type: "",
  buyer2_address: "",
  buyer2_department: "",
  buyer_has_representative: false,
  buyer_rep_name: "",
  buyer_rep_ci: "",
  buyer_rep_address: "",
  buyer_rep_power_date: "",
  buyer_rep_power_notary: "",
  buyer_rep_power_protocol_date: "",
  buyer_rep_power_type: "",
  buyer_rep_can_substitute: false,
  vehicle_brand: "",
  vehicle_brand_dgr_id: "",
  vehicle_model: "",
  vehicle_model_dgr_id: "",
  vehicle_year: "",
  vehicle_type: "",
  vehicle_type_dgr_id: "",
  vehicle_fuel: "nafta",
  vehicle_fuel_dgr_id: "",
  vehicle_cylinders: "",
  vehicle_motor_number: "",
  vehicle_chassis_number: "",
  vehicle_plate: "",
  vehicle_padron: "",
  vehicle_padron_department: "",
  vehicle_national_code: "",
  vehicle_affectation: "particular",
  vehicle_owner_name: "",
  vehicle_owner_ci: "",
  price_amount: "",
  price_currency: "USD",
  price_in_words: "",
  payment_type: "contado",
  payment_detail: "",
  payment_installments_count: "",
  payment_installment_amount: "",
  payment_cash_amount: "",
  payment_bank_name: "",
  payment_third_party_name: "",
  payment_third_party_ci: "",
  bps_status: "no",
  irae_status: "no",
  imeba_status: "no",
  bps_cert_number: "",
  bps_cert_date: "",
  cud_number: "",
  cud_date: "",
  previous_owner_name: "",
  previous_title_date: "",
  previous_title_notary: "",
  previous_title_same_notary: false,
  previous_title_registry: "",
  previous_title_number: "",
  previous_title_registry_date: "",
  previous_title_type: "",
  previous_title_is_first_registration: false,
  insurance_policy_number: "",
  insurance_company: "",
  insurance_expiry: "",
  insurance_separate_cert: false,
  has_plate_history: false,
  plate_history_entries: [],
  election_declaration: "",
  has_traffic_responsibility_clause: false,
  traffic_responsibility_date: "",
  transaction_date: new Date().toISOString().split("T")[0],
  paper_series_proto: "",
  paper_number_proto: "",
  paper_series_testimony: "",
  paper_numbers_testimony: "",
};

const civilStatusOptions = [
  { value: "soltero", label: "Soltero/a" },
  { value: "casado", label: "Casado/a" },
  { value: "divorciado", label: "Divorciado/a" },
  { value: "viudo", label: "Viudo/a" },
  { value: "separado_bienes", label: "Separado/a de bienes" },
];

const nupciasOptions = [
  { value: "", label: "—" },
  { value: "unicas", label: "Únicas nupcias" },
  { value: "primeras", label: "Primeras nupcias" },
  { value: "segundas", label: "Segundas nupcias" },
  { value: "terceras", label: "Terceras nupcias" },
];

const paymentTypeOptions = [
  { value: "contado", label: "Al contado (en efectivo)" },
  { value: "saldo_precio", label: "Saldo precio (cuotas)" },
  { value: "transferencia_bancaria", label: "Transferencia bancaria" },
  { value: "letra_cambio", label: "Letra de cambio" },
  { value: "mixto", label: "Mixto (efectivo + otro)" },
  { value: "cesion_tercero", label: "Cesión a tercero" },
];

const taxStatusOptions = [
  { value: "no", label: "No es contribuyente" },
  { value: "si", label: "Sí es contribuyente" },
  { value: "no_controlado", label: "No controlado" },
];

const powerTypeOptions = [
  { value: "", label: "—" },
  { value: "poder_especial", label: "Poder especial" },
  { value: "carta_poder", label: "Carta poder" },
  { value: "submandato", label: "Submandato" },
];

const previousTitleTypeOptions = [
  { value: "", label: "—" },
  { value: "documento_privado", label: "Documento privado" },
  { value: "escritura_publica", label: "Escritura pública" },
  { value: "sucesion", label: "Sucesión" },
];

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      {label}
    </label>
  );
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <h3 className="font-semibold text-gray-800">{title}</h3>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

interface TransactionFormProps {
  userId: string;
  nextMatriz: number;
  nextFolio: number;
}

export default function TransactionForm({
  userId,
  nextMatriz,
  nextFolio,
}: TransactionFormProps) {
  const [form, setForm] = useState<FormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();
  const router = useRouter();

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function swapBuyerSeller() {
    setForm((prev) => ({
      ...prev,
      seller_full_name: prev.buyer_full_name,
      seller_ci: prev.buyer_ci,
      seller_nationality: prev.buyer_nationality,
      seller_birth_date: prev.buyer_birth_date,
      seller_birth_place: prev.buyer_birth_place,
      seller_civil_status: prev.buyer_civil_status,
      seller_civil_status_detail: prev.buyer_civil_status_detail,
      seller_nupcias_type: prev.buyer_nupcias_type,
      seller_spouse_name: prev.buyer_spouse_name,
      seller_divorce_ficha: prev.buyer_divorce_ficha,
      seller_divorce_year: prev.buyer_divorce_year,
      seller_divorce_court: prev.buyer_divorce_court,
      seller_address: prev.buyer_address,
      seller_department: prev.buyer_department,
      seller_phone: prev.buyer_phone,
      seller_is_company: prev.buyer_is_company,
      seller_company_name: prev.buyer_company_name,
      seller_company_type: prev.buyer_company_type,
      seller_rut: prev.buyer_rut,
      seller_company_registry_number: prev.buyer_company_registry_number,
      seller_company_registry_folio: prev.buyer_company_registry_folio,
      seller_company_registry_book: prev.buyer_company_registry_book,
      seller_company_business_purpose: prev.buyer_company_business_purpose,
      seller_company_law_19484: prev.buyer_company_law_19484,
      seller_representative_name: prev.buyer_representative_name,
      seller_representative_ci: prev.buyer_representative_ci,
      seller_representative_role: prev.buyer_representative_role,
      seller_representative_address: prev.buyer_representative_address,
      buyer_full_name: prev.seller_full_name,
      buyer_ci: prev.seller_ci,
      buyer_nationality: prev.seller_nationality,
      buyer_birth_date: prev.seller_birth_date,
      buyer_birth_place: prev.seller_birth_place,
      buyer_civil_status: prev.seller_civil_status,
      buyer_civil_status_detail: prev.seller_civil_status_detail,
      buyer_nupcias_type: prev.seller_nupcias_type,
      buyer_spouse_name: prev.seller_spouse_name,
      buyer_divorce_ficha: prev.seller_divorce_ficha,
      buyer_divorce_year: prev.seller_divorce_year,
      buyer_divorce_court: prev.seller_divorce_court,
      buyer_address: prev.seller_address,
      buyer_department: prev.seller_department,
      buyer_phone: prev.seller_phone,
      buyer_is_company: prev.seller_is_company,
      buyer_company_name: prev.seller_company_name,
      buyer_company_type: prev.seller_company_type,
      buyer_rut: prev.seller_rut,
      buyer_company_registry_number: prev.seller_company_registry_number,
      buyer_company_registry_folio: prev.seller_company_registry_folio,
      buyer_company_registry_book: prev.seller_company_registry_book,
      buyer_company_business_purpose: prev.seller_company_business_purpose,
      buyer_company_law_19484: prev.seller_company_law_19484,
      buyer_representative_name: prev.seller_representative_name,
      buyer_representative_ci: prev.seller_representative_ci,
      buyer_representative_role: prev.seller_representative_role,
      buyer_representative_address: prev.seller_representative_address,
    }));
  }

  function addPlateHistoryEntry() {
    set("plate_history_entries", [
      ...form.plate_history_entries,
      { department: "", padron: "", matricula: "", date: "" },
    ]);
  }

  function removePlateHistoryEntry(index: number) {
    set(
      "plate_history_entries",
      form.plate_history_entries.filter((_, i) => i !== index)
    );
  }

  function updatePlateHistoryEntry(
    index: number,
    field: keyof PlateHistoryEntry,
    value: string
  ) {
    const entries = [...form.plate_history_entries];
    entries[index] = { ...entries[index], [field]: value };
    set("plate_history_entries", entries);
  }

  async function saveTransaction(status: "borrador" | "completado") {
    setSaving(true);
    setError("");

    try {
      // 1. Create/update seller client
      const { data: seller, error: sellerErr } = await supabase
        .from("clients")
        .insert({
          user_id: userId,
          full_name: form.seller_full_name,
          ci_number: form.seller_ci || null,
          nationality: form.seller_nationality,
          birth_date: form.seller_birth_date || null,
          birth_place: form.seller_birth_place || null,
          civil_status: form.seller_civil_status,
          civil_status_detail: form.seller_civil_status_detail || null,
          nupcias_type: form.seller_nupcias_type || null,
          spouse_name: form.seller_spouse_name || null,
          divorce_ficha: form.seller_divorce_ficha || null,
          divorce_year: form.seller_divorce_year || null,
          divorce_court: form.seller_divorce_court || null,
          address: form.seller_address || null,
          department: form.seller_department,
          phone: form.seller_phone || null,
          is_company: form.seller_is_company,
          company_name: form.seller_company_name || null,
          company_type: form.seller_company_type || null,
          rut: form.seller_rut || null,
          company_registry_number: form.seller_company_registry_number || null,
          company_registry_folio: form.seller_company_registry_folio || null,
          company_registry_book: form.seller_company_registry_book || null,
          company_business_purpose: form.seller_company_business_purpose || null,
          company_law_19484: form.seller_company_law_19484,
          representative_name: form.seller_representative_name || null,
          representative_ci: form.seller_representative_ci || null,
          representative_role: form.seller_representative_role || null,
          representative_address: form.seller_representative_address || null,
        })
        .select()
        .single();

      if (sellerErr) throw sellerErr;

      // 2. Create seller2 if applicable
      let seller2Id: string | null = null;
      if (form.has_seller2) {
        const { data: seller2, error: s2Err } = await supabase
          .from("clients")
          .insert({
            user_id: userId,
            full_name: form.seller2_full_name,
            ci_number: form.seller2_ci || null,
            nationality: form.seller2_nationality,
            birth_date: form.seller2_birth_date || null,
            birth_place: form.seller2_birth_place || null,
            civil_status: form.seller2_civil_status,
            civil_status_detail: form.seller2_civil_status_detail || null,
            nupcias_type: form.seller2_nupcias_type || null,
            address: form.seller2_address || null,
            department: form.seller2_department,
          })
          .select()
          .single();
        if (s2Err) throw s2Err;
        seller2Id = seller2?.id ?? null;
      }

      // 3. Create buyer client
      const { data: buyer, error: buyerErr } = await supabase
        .from("clients")
        .insert({
          user_id: userId,
          full_name: form.buyer_full_name,
          ci_number: form.buyer_ci || null,
          nationality: form.buyer_nationality,
          birth_date: form.buyer_birth_date || null,
          birth_place: form.buyer_birth_place || null,
          civil_status: form.buyer_civil_status,
          civil_status_detail: form.buyer_civil_status_detail || null,
          nupcias_type: form.buyer_nupcias_type || null,
          spouse_name: form.buyer_spouse_name || null,
          divorce_ficha: form.buyer_divorce_ficha || null,
          divorce_year: form.buyer_divorce_year || null,
          divorce_court: form.buyer_divorce_court || null,
          address: form.buyer_address || null,
          department: form.buyer_department,
          phone: form.buyer_phone || null,
          is_company: form.buyer_is_company,
          company_name: form.buyer_company_name || null,
          company_type: form.buyer_company_type || null,
          rut: form.buyer_rut || null,
          company_registry_number: form.buyer_company_registry_number || null,
          company_registry_folio: form.buyer_company_registry_folio || null,
          company_registry_book: form.buyer_company_registry_book || null,
          company_business_purpose: form.buyer_company_business_purpose || null,
          company_law_19484: form.buyer_company_law_19484,
          representative_name: form.buyer_representative_name || null,
          representative_ci: form.buyer_representative_ci || null,
          representative_role: form.buyer_representative_role || null,
          representative_address: form.buyer_representative_address || null,
        })
        .select()
        .single();

      if (buyerErr) throw buyerErr;

      // 4. Create buyer2 if applicable
      let buyer2Id: string | null = null;
      if (form.has_buyer2) {
        const { data: buyer2, error: b2Err } = await supabase
          .from("clients")
          .insert({
            user_id: userId,
            full_name: form.buyer2_full_name,
            ci_number: form.buyer2_ci || null,
            nationality: form.buyer2_nationality,
            birth_date: form.buyer2_birth_date || null,
            birth_place: form.buyer2_birth_place || null,
            civil_status: form.buyer2_civil_status,
            civil_status_detail: form.buyer2_civil_status_detail || null,
            nupcias_type: form.buyer2_nupcias_type || null,
            address: form.buyer2_address || null,
            department: form.buyer2_department,
          })
          .select()
          .single();
        if (b2Err) throw b2Err;
        buyer2Id = buyer2?.id ?? null;
      }

      // 5. Create vehicle
      const { data: vehicle, error: vehicleErr } = await supabase
        .from("vehicles")
        .insert({
          user_id: userId,
          brand: form.vehicle_brand || null,
          model: form.vehicle_model || null,
          year: form.vehicle_year ? parseInt(form.vehicle_year) : null,
          type: form.vehicle_type || null,
          fuel: form.vehicle_fuel,
          cylinders: form.vehicle_cylinders
            ? parseInt(form.vehicle_cylinders)
            : null,
          motor_number: form.vehicle_motor_number || null,
          chassis_number: form.vehicle_chassis_number || null,
          plate: form.vehicle_plate || null,
          padron: form.vehicle_padron || null,
          padron_department: form.vehicle_padron_department || null,
          national_code: form.vehicle_national_code || null,
          affectation: form.vehicle_affectation,
          owner_name: form.vehicle_owner_name || null,
          owner_ci: form.vehicle_owner_ci || null,
        })
        .select()
        .single();

      if (vehicleErr) throw vehicleErr;

      // 6. Create transaction
      const matrizNumber = status === "completado" ? nextMatriz : null;
      const folioStart = status === "completado" ? nextFolio : null;

      const { data: transaction, error: txErr } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          seller_id: seller!.id,
          seller2_id: seller2Id,
          buyer_id: buyer!.id,
          buyer2_id: buyer2Id,
          vehicle_id: vehicle!.id,
          // Seller representative
          seller_has_representative: form.seller_has_representative,
          seller_representative_name: form.seller_rep_name || null,
          seller_representative_ci: form.seller_rep_ci || null,
          seller_representative_address: form.seller_rep_address || null,
          seller_representative_power_date: form.seller_rep_power_date || null,
          seller_representative_power_notary: form.seller_rep_power_notary || null,
          seller_representative_power_protocol_date: form.seller_rep_power_protocol_date || null,
          seller_representative_power_type: form.seller_rep_power_type || null,
          seller_representative_can_substitute: form.seller_rep_can_substitute,
          // Buyer representative
          buyer_has_representative: form.buyer_has_representative,
          buyer_representative_name: form.buyer_rep_name || null,
          buyer_representative_ci: form.buyer_rep_ci || null,
          buyer_representative_address: form.buyer_rep_address || null,
          buyer_representative_power_date: form.buyer_rep_power_date || null,
          buyer_representative_power_notary: form.buyer_rep_power_notary || null,
          buyer_representative_power_protocol_date: form.buyer_rep_power_protocol_date || null,
          buyer_representative_power_type: form.buyer_rep_power_type || null,
          buyer_representative_can_substitute: form.buyer_rep_can_substitute,
          // Price
          price_amount: form.price_amount
            ? parseFloat(form.price_amount)
            : null,
          price_currency: form.price_currency,
          price_in_words: form.price_in_words || null,
          payment_type: form.payment_type,
          payment_detail: form.payment_detail || null,
          payment_installments_count: form.payment_installments_count
            ? parseInt(form.payment_installments_count)
            : null,
          payment_installment_amount: form.payment_installment_amount
            ? parseFloat(form.payment_installment_amount)
            : null,
          payment_cash_amount: form.payment_cash_amount
            ? parseFloat(form.payment_cash_amount)
            : null,
          payment_bank_name: form.payment_bank_name || null,
          payment_third_party_name: form.payment_third_party_name || null,
          payment_third_party_ci: form.payment_third_party_ci || null,
          // Tax
          bps_status: form.bps_status,
          irae_status: form.irae_status,
          imeba_status: form.imeba_status,
          bps_cert_number: form.bps_cert_number || null,
          bps_cert_date: form.bps_cert_date || null,
          cud_number: form.cud_number || null,
          cud_date: form.cud_date || null,
          // Previous title
          previous_owner_name: form.previous_owner_name || null,
          previous_title_date: form.previous_title_date || null,
          previous_title_notary: form.previous_title_notary || null,
          previous_title_same_notary: form.previous_title_same_notary,
          previous_title_registry: form.previous_title_registry || null,
          previous_title_number: form.previous_title_number || null,
          previous_title_registry_date:
            form.previous_title_registry_date || null,
          previous_title_type: form.previous_title_type || null,
          previous_title_is_first_registration: form.previous_title_is_first_registration,
          // Insurance
          insurance_policy_number: form.insurance_policy_number || null,
          insurance_company: form.insurance_company || null,
          insurance_expiry: form.insurance_expiry || null,
          insurance_separate_cert: form.insurance_separate_cert,
          // Plate history
          has_plate_history: form.has_plate_history,
          plate_history_entries:
            form.plate_history_entries.length > 0
              ? JSON.stringify(form.plate_history_entries)
              : null,
          // Extra clauses
          election_declaration: form.election_declaration || null,
          has_traffic_responsibility_clause: form.has_traffic_responsibility_clause,
          traffic_responsibility_date: form.traffic_responsibility_date || null,
          // Proto
          matriz_number: matrizNumber,
          folio_start: folioStart,
          paper_series_proto: form.paper_series_proto || null,
          paper_number_proto: form.paper_number_proto || null,
          paper_series_testimony: form.paper_series_testimony || null,
          paper_numbers_testimony: form.paper_numbers_testimony || null,
          transaction_date: form.transaction_date,
          status,
          folder_name: `${form.vehicle_brand}-${form.vehicle_model}-${form.vehicle_plate}`.toUpperCase(),
        })
        .select()
        .single();

      if (txErr) throw txErr;

      // 7. Update next matriz/folio if completed
      if (status === "completado" && matrizNumber) {
        await supabase
          .from("profiles")
          .update({
            next_matriz_number: matrizNumber + 1,
            next_folio_number: (folioStart ?? 0) + 4,
          })
          .eq("id", userId);
      }

      router.push("/compraventas");
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al guardar";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  function renderPersonFields(prefix: "seller" | "buyer") {
    const p = (field: string) =>
      `${prefix}_${field}` as keyof FormData;

    const civilStatus = form[p("civil_status")] as string;
    const showNupcias = civilStatus === "casado" || civilStatus === "separado_bienes" || civilStatus === "viudo" || civilStatus === "divorciado";
    const showSpouse = civilStatus === "casado" || civilStatus === "separado_bienes";
    const showDivorce = civilStatus === "divorciado";

    return (
      <>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Checkbox
            label="Es empresa / persona jurídica"
            checked={form[p("is_company")] as boolean}
            onChange={(v) => set(p("is_company"), v)}
          />
        </div>

        {form[p("is_company")] ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <Input
              label="Razón social"
              value={form[p("company_name")] as string}
              onChange={(v) => set(p("company_name"), v)}
            />
            <Input
              label="Tipo (SA, SRL, SAS)"
              value={form[p("company_type")] as string}
              onChange={(v) => set(p("company_type"), v)}
            />
            <Input
              label="RUT"
              value={form[p("rut")] as string}
              onChange={(v) => set(p("rut"), v)}
            />
            <Input
              label="Nro. inscripción registro"
              value={form[p("company_registry_number")] as string}
              onChange={(v) => set(p("company_registry_number"), v)}
            />
            <Input
              label="Folio"
              value={form[p("company_registry_folio")] as string}
              onChange={(v) => set(p("company_registry_folio"), v)}
            />
            <Input
              label="Libro"
              value={form[p("company_registry_book")] as string}
              onChange={(v) => set(p("company_registry_book"), v)}
            />
            <Input
              label="Objeto social"
              value={form[p("company_business_purpose")] as string}
              onChange={(v) => set(p("company_business_purpose"), v)}
              className="md:col-span-2"
            />
            <div className="flex items-end">
              <Checkbox
                label="Cumple Ley 19.484"
                checked={form[p("company_law_19484")] as boolean}
                onChange={(v) => set(p("company_law_19484"), v)}
              />
            </div>
            <Input
              label="Representante - Nombre"
              value={form[p("representative_name")] as string}
              onChange={(v) => set(p("representative_name"), v)}
            />
            <Input
              label="Representante - CI"
              value={form[p("representative_ci")] as string}
              onChange={(v) => set(p("representative_ci"), v)}
            />
            <Input
              label="Representante - Cargo"
              value={form[p("representative_role")] as string}
              onChange={(v) => set(p("representative_role"), v)}
            />
            <Input
              label="Representante - Domicilio"
              value={form[p("representative_address")] as string}
              onChange={(v) => set(p("representative_address"), v)}
              className="md:col-span-3"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <Input
              label="Nombre completo"
              value={form[p("full_name")] as string}
              onChange={(v) => set(p("full_name"), v)}
            />
            <Input
              label="Cédula de identidad"
              value={form[p("ci")] as string}
              onChange={(v) => set(p("ci"), v)}
            />
            <Input
              label="Nacionalidad"
              value={form[p("nationality")] as string}
              onChange={(v) => set(p("nationality"), v)}
            />
            <Input
              label="Fecha de nacimiento"
              type="date"
              value={form[p("birth_date")] as string}
              onChange={(v) => set(p("birth_date"), v)}
            />
            <Input
              label="Lugar de nacimiento"
              value={form[p("birth_place")] as string}
              onChange={(v) => set(p("birth_place"), v)}
            />
            <Select
              label="Estado civil"
              value={civilStatus}
              onChange={(v) => set(p("civil_status"), v)}
              options={civilStatusOptions}
            />
            {showNupcias && (
              <Select
                label="Nupcias"
                value={form[p("nupcias_type")] as string}
                onChange={(v) => set(p("nupcias_type"), v)}
                options={nupciasOptions}
              />
            )}
            {showSpouse && (
              <>
                <Input
                  label="Detalle (en únicas nupcias, etc.)"
                  value={form[p("civil_status_detail")] as string}
                  onChange={(v) => set(p("civil_status_detail"), v)}
                />
                <Input
                  label="Nombre del cónyuge"
                  value={form[p("spouse_name")] as string}
                  onChange={(v) => set(p("spouse_name"), v)}
                />
              </>
            )}
            {showDivorce && (
              <>
                <Input
                  label="Ficha de divorcio"
                  value={form[p("divorce_ficha")] as string}
                  onChange={(v) => set(p("divorce_ficha"), v)}
                />
                <Input
                  label="Año de divorcio"
                  value={form[p("divorce_year")] as string}
                  onChange={(v) => set(p("divorce_year"), v)}
                />
                <Input
                  label="Juzgado"
                  value={form[p("divorce_court")] as string}
                  onChange={(v) => set(p("divorce_court"), v)}
                />
              </>
            )}
            <Input
              label="Domicilio"
              value={form[p("address")] as string}
              onChange={(v) => set(p("address"), v)}
              className="md:col-span-2"
            />
            <Input
              label="Departamento"
              value={form[p("department")] as string}
              onChange={(v) => set(p("department"), v)}
            />
            <Input
              label="Teléfono"
              value={form[p("phone")] as string}
              onChange={(v) => set(p("phone"), v)}
            />
          </div>
        )}
      </>
    );
  }

  function renderRepresentativeSection(
    prefix: "seller" | "buyer",
    label: string
  ) {
    const hasRep = prefix === "seller" ? form.seller_has_representative : form.buyer_has_representative;
    const repPrefix = `${prefix}_rep_`;
    const hasRepKey = `${prefix}_has_representative` as keyof FormData;

    return (
      <div className="mt-4 pt-4 border-t space-y-3">
        <Checkbox
          label={`El ${label} tiene apoderado/representante`}
          checked={hasRep}
          onChange={(v) => set(hasRepKey, v)}
        />
        {hasRep && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label="Nombre del apoderado"
              value={form[`${repPrefix}name` as keyof FormData] as string}
              onChange={(v) => set(`${repPrefix}name` as keyof FormData, v)}
            />
            <Input
              label="CI del apoderado"
              value={form[`${repPrefix}ci` as keyof FormData] as string}
              onChange={(v) => set(`${repPrefix}ci` as keyof FormData, v)}
            />
            <Input
              label="Domicilio del apoderado"
              value={form[`${repPrefix}address` as keyof FormData] as string}
              onChange={(v) => set(`${repPrefix}address` as keyof FormData, v)}
            />
            <Select
              label="Tipo de poder"
              value={form[`${repPrefix}power_type` as keyof FormData] as string}
              onChange={(v) => set(`${repPrefix}power_type` as keyof FormData, v)}
              options={powerTypeOptions}
            />
            <Input
              label="Fecha del poder"
              type="date"
              value={form[`${repPrefix}power_date` as keyof FormData] as string}
              onChange={(v) => set(`${repPrefix}power_date` as keyof FormData, v)}
            />
            <Input
              label="Escribano que certificó"
              value={form[`${repPrefix}power_notary` as keyof FormData] as string}
              onChange={(v) => set(`${repPrefix}power_notary` as keyof FormData, v)}
            />
            <Input
              label="Fecha de protocolización"
              type="date"
              value={form[`${repPrefix}power_protocol_date` as keyof FormData] as string}
              onChange={(v) => set(`${repPrefix}power_protocol_date` as keyof FormData, v)}
            />
            <div className="flex items-end">
              <Checkbox
                label="Con facultad de sustitución"
                checked={form[`${repPrefix}can_substitute` as keyof FormData] as boolean}
                onChange={(v) => set(`${repPrefix}can_substitute` as keyof FormData, v)}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderCoPartySection(
    type: "seller2" | "buyer2",
    label: string
  ) {
    const hasKey = type === "seller2" ? "has_seller2" : "has_buyer2";
    const hasValue = form[hasKey] as boolean;
    const p = (field: string) => `${type}_${field}` as keyof FormData;

    return (
      <div className="mt-4 pt-4 border-t space-y-3">
        <Checkbox
          label={label}
          checked={hasValue}
          onChange={(v) => set(hasKey, v)}
        />
        {hasValue && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
            <Input
              label="Nombre completo"
              value={form[p("full_name")] as string}
              onChange={(v) => set(p("full_name"), v)}
            />
            <Input
              label="Cédula"
              value={form[p("ci")] as string}
              onChange={(v) => set(p("ci"), v)}
            />
            <Input
              label="Nacionalidad"
              value={form[p("nationality")] as string}
              onChange={(v) => set(p("nationality"), v)}
            />
            <Input
              label="Fecha de nacimiento"
              type="date"
              value={form[p("birth_date")] as string}
              onChange={(v) => set(p("birth_date"), v)}
            />
            <Input
              label="Lugar de nacimiento"
              value={form[p("birth_place")] as string}
              onChange={(v) => set(p("birth_place"), v)}
            />
            <Select
              label="Estado civil"
              value={form[p("civil_status")] as string}
              onChange={(v) => set(p("civil_status"), v)}
              options={civilStatusOptions}
            />
            {(form[p("civil_status")] === "casado" || form[p("civil_status")] === "separado_bienes" || form[p("civil_status")] === "viudo" || form[p("civil_status")] === "divorciado") && (
              <Select
                label="Nupcias"
                value={form[p("nupcias_type")] as string}
                onChange={(v) => set(p("nupcias_type"), v)}
                options={nupciasOptions}
              />
            )}
            <Input
              label="Domicilio"
              value={form[p("address")] as string}
              onChange={(v) => set(p("address"), v)}
              className="md:col-span-2"
            />
            <Input
              label="Departamento"
              value={form[p("department")] as string}
              onChange={(v) => set(p("department"), v)}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          Nueva Compraventa
        </h1>
        <button
          onClick={swapBuyerSeller}
          className="flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-gray-100 transition-colors"
        >
          <ArrowLeftRight size={16} />
          Invertir comprador/vendedor
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Vendedor */}
      <Section title="Vendedor">
        {renderPersonFields("seller")}
        {renderRepresentativeSection("seller", "vendedor")}
        {renderCoPartySection("seller2", "El cónyuge también es vendedor (2 vendedores)")}
      </Section>

      {/* Comprador */}
      <Section title="Comprador">
        {renderPersonFields("buyer")}
        {renderRepresentativeSection("buyer", "comprador")}
        {renderCoPartySection("buyer2", "Hay un segundo comprador")}
      </Section>

      {/* Vehículo */}
      <Section title="Vehículo">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <DgrCombobox
            label="Marca"
            value={form.vehicle_brand}
            dgrId={form.vehicle_brand_dgr_id}
            onChange={(v, id) => {
              set("vehicle_brand", v);
              set("vehicle_brand_dgr_id", id);
              // Reset model when brand changes
              if (id !== form.vehicle_brand_dgr_id) {
                set("vehicle_model", "");
                set("vehicle_model_dgr_id", "");
              }
            }}
            catalogName="marcas"
          />
          <DgrCombobox
            label="Modelo"
            value={form.vehicle_model}
            dgrId={form.vehicle_model_dgr_id}
            onChange={(v, id) => {
              set("vehicle_model", v);
              set("vehicle_model_dgr_id", id);
            }}
            catalogName="modelos"
            prefix={form.vehicle_brand_dgr_id}
            disabled={!form.vehicle_brand_dgr_id && !form.vehicle_brand}
            placeholder={form.vehicle_brand ? "Buscar modelo..." : "Seleccioná una marca primero"}
          />
          <Input
            label="Año"
            type="number"
            value={form.vehicle_year}
            onChange={(v) => set("vehicle_year", v)}
          />
          <DgrCombobox
            label="Tipo de vehículo"
            value={form.vehicle_type}
            dgrId={form.vehicle_type_dgr_id}
            onChange={(v, id) => {
              set("vehicle_type", v);
              set("vehicle_type_dgr_id", id);
            }}
            catalogName="tipos_vehiculo"
          />
          <DgrCombobox
            label="Combustible"
            value={form.vehicle_fuel}
            dgrId={form.vehicle_fuel_dgr_id}
            onChange={(v, id) => {
              set("vehicle_fuel", v);
              set("vehicle_fuel_dgr_id", id);
            }}
            catalogName="combustibles"
            placeholder="Buscar combustible..."
          />
          <Input
            label="Cilindrada"
            value={form.vehicle_cylinders}
            onChange={(v) => set("vehicle_cylinders", v)}
          />
          <Input
            label="Nro. Motor"
            value={form.vehicle_motor_number}
            onChange={(v) => set("vehicle_motor_number", v)}
          />
          <Input
            label="Nro. Chasis"
            value={form.vehicle_chassis_number}
            onChange={(v) => set("vehicle_chassis_number", v)}
          />
          <Input
            label="Matrícula"
            value={form.vehicle_plate}
            onChange={(v) => set("vehicle_plate", v)}
            placeholder="ABC1234"
          />
          <Input
            label="Padrón"
            value={form.vehicle_padron}
            onChange={(v) => set("vehicle_padron", v)}
          />
          <Input
            label="Depto. del padrón"
            value={form.vehicle_padron_department}
            onChange={(v) => set("vehicle_padron_department", v)}
          />
          <Input
            label="Código nacional"
            value={form.vehicle_national_code}
            onChange={(v) => set("vehicle_national_code", v)}
          />
          <Select
            label="Afectación"
            value={form.vehicle_affectation}
            onChange={(v) => set("vehicle_affectation", v)}
            options={[
              { value: "particular", label: "Particular" },
              { value: "alquiler", label: "Alquiler" },
              { value: "carga", label: "Carga" },
              { value: "oficial", label: "Oficial" },
            ]}
          />
          <Input
            label="Titular según libreta"
            value={form.vehicle_owner_name}
            onChange={(v) => set("vehicle_owner_name", v)}
          />
          <Input
            label="CI/RUT del titular"
            value={form.vehicle_owner_ci}
            onChange={(v) => set("vehicle_owner_ci", v)}
          />
        </div>
      </Section>

      {/* Precio y pago */}
      <Section title="Precio y forma de pago">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label="Monto"
            type="number"
            value={form.price_amount}
            onChange={(v) => set("price_amount", v)}
          />
          <Select
            label="Moneda"
            value={form.price_currency}
            onChange={(v) => set("price_currency", v)}
            options={[
              { value: "USD", label: "Dólares (USD)" },
              { value: "UYU", label: "Pesos Uruguayos ($)" },
            ]}
          />
          <Input
            label="Monto en letras"
            value={form.price_in_words}
            onChange={(v) => set("price_in_words", v)}
            className="md:col-span-3"
            placeholder="Ej: TRES MIL QUINIENTOS DÓLARES AMERICANOS"
          />
          <Select
            label="Forma de pago"
            value={form.payment_type}
            onChange={(v) => set("payment_type", v)}
            options={paymentTypeOptions}
          />
          {form.payment_type === "saldo_precio" && (
            <>
              <Input
                label="Cantidad de cuotas"
                type="number"
                value={form.payment_installments_count}
                onChange={(v) => set("payment_installments_count", v)}
              />
              <Input
                label="Monto de cada cuota"
                type="number"
                value={form.payment_installment_amount}
                onChange={(v) => set("payment_installment_amount", v)}
              />
              <Input
                label="Detalle adicional"
                value={form.payment_detail}
                onChange={(v) => set("payment_detail", v)}
                className="md:col-span-3"
                placeholder="Ej: cuotas mensuales y consecutivas"
              />
            </>
          )}
          {form.payment_type === "contado_cheque" && (
            <Input
              label="Banco del cheque"
              value={form.payment_bank_name}
              onChange={(v) => set("payment_bank_name", v)}
              className="md:col-span-2"
            />
          )}
          {form.payment_type === "contado_transferencia" && (
            <Input
              label="Banco de la transferencia"
              value={form.payment_bank_name}
              onChange={(v) => set("payment_bank_name", v)}
              className="md:col-span-2"
            />
          )}
          {form.payment_type === "mixto" && (
            <>
              <Input
                label="Monto en efectivo"
                type="number"
                value={form.payment_cash_amount}
                onChange={(v) => set("payment_cash_amount", v)}
              />
              <Input
                label="Detalle del resto"
                value={form.payment_detail}
                onChange={(v) => set("payment_detail", v)}
                className="md:col-span-2"
                placeholder="Ej: saldo de USD 2000 en 4 cuotas"
              />
            </>
          )}
          {form.payment_type === "tercero" && (
            <>
              <Input
                label="Nombre del tercero"
                value={form.payment_third_party_name}
                onChange={(v) => set("payment_third_party_name", v)}
              />
              <Input
                label="CI del tercero"
                value={form.payment_third_party_ci}
                onChange={(v) => set("payment_third_party_ci", v)}
              />
              <Input
                label="Detalle"
                value={form.payment_detail}
                onChange={(v) => set("payment_detail", v)}
                className="md:col-span-3"
              />
            </>
          )}
        </div>
      </Section>

      {/* Declaraciones tributarias */}
      <Section title="Declaraciones tributarias" defaultOpen={false}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select
            label="BPS"
            value={form.bps_status}
            onChange={(v) => set("bps_status", v)}
            options={taxStatusOptions}
          />
          <Select
            label="IRAE"
            value={form.irae_status}
            onChange={(v) => set("irae_status", v)}
            options={taxStatusOptions}
          />
          <Select
            label="IMEBA"
            value={form.imeba_status}
            onChange={(v) => set("imeba_status", v)}
            options={taxStatusOptions}
          />
          {form.bps_status === "si" && (
            <>
              <Input
                label="Nro. certificado BPS"
                value={form.bps_cert_number}
                onChange={(v) => set("bps_cert_number", v)}
              />
              <Input
                label="Fecha certificado BPS"
                type="date"
                value={form.bps_cert_date}
                onChange={(v) => set("bps_cert_date", v)}
              />
            </>
          )}
          {(form.bps_status === "si" || form.irae_status === "si") && (
            <>
              <Input
                label="Nro. CUD (DGI)"
                value={form.cud_number}
                onChange={(v) => set("cud_number", v)}
              />
              <Input
                label="Fecha CUD"
                type="date"
                value={form.cud_date}
                onChange={(v) => set("cud_date", v)}
              />
            </>
          )}
        </div>
      </Section>

      {/* Título anterior */}
      <Section title="Título anterior" defaultOpen={false}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select
            label="Tipo de título anterior"
            value={form.previous_title_type}
            onChange={(v) => set("previous_title_type", v)}
            options={previousTitleTypeOptions}
          />
          <Checkbox
            label="Es primera inscripción (0 km)"
            checked={form.previous_title_is_first_registration}
            onChange={(v) => set("previous_title_is_first_registration", v)}
          />
          <div />
          <Input
            label="Propietario anterior"
            value={form.previous_owner_name}
            onChange={(v) => set("previous_owner_name", v)}
          />
          <Input
            label="Fecha del título anterior"
            type="date"
            value={form.previous_title_date}
            onChange={(v) => set("previous_title_date", v)}
          />
          <Input
            label="Escribano otorgante"
            value={form.previous_title_notary}
            onChange={(v) => set("previous_title_notary", v)}
          />
          <Checkbox
            label="¿Fue ante el mismo escribano?"
            checked={form.previous_title_same_notary}
            onChange={(v) => set("previous_title_same_notary", v)}
          />
          <Input
            label="Registro"
            value={form.previous_title_registry}
            onChange={(v) => set("previous_title_registry", v)}
          />
          <Input
            label="Número de inscripción"
            value={form.previous_title_number}
            onChange={(v) => set("previous_title_number", v)}
          />
          <Input
            label="Fecha de inscripción"
            type="date"
            value={form.previous_title_registry_date}
            onChange={(v) => set("previous_title_registry_date", v)}
          />
        </div>
      </Section>

      {/* Seguro */}
      <Section title="Seguro" defaultOpen={false}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label="Nro. de póliza"
            value={form.insurance_policy_number}
            onChange={(v) => set("insurance_policy_number", v)}
          />
          <Input
            label="Compañía aseguradora"
            value={form.insurance_company}
            onChange={(v) => set("insurance_company", v)}
          />
          <Input
            label="Vigencia"
            type="date"
            value={form.insurance_expiry}
            onChange={(v) => set("insurance_expiry", v)}
          />
          <Checkbox
            label="Certificado de seguro por separado"
            checked={form.insurance_separate_cert}
            onChange={(v) => set("insurance_separate_cert", v)}
          />
        </div>
      </Section>

      {/* Historial de matrículas */}
      <Section title="Historial de matrículas" defaultOpen={false}>
        <div className="space-y-3">
          <Checkbox
            label="El vehículo tuvo matrículas anteriores"
            checked={form.has_plate_history}
            onChange={(v) => set("has_plate_history", v)}
          />
          {form.has_plate_history && (
            <div className="space-y-3">
              {form.plate_history_entries.map((entry, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                  <Input
                    label="Departamento"
                    value={entry.department}
                    onChange={(v) => updatePlateHistoryEntry(idx, "department", v)}
                  />
                  <Input
                    label="Padrón"
                    value={entry.padron}
                    onChange={(v) => updatePlateHistoryEntry(idx, "padron", v)}
                  />
                  <Input
                    label="Matrícula"
                    value={entry.matricula}
                    onChange={(v) => updatePlateHistoryEntry(idx, "matricula", v)}
                  />
                  <Input
                    label="Fecha"
                    type="date"
                    value={entry.date}
                    onChange={(v) => updatePlateHistoryEntry(idx, "date", v)}
                  />
                  <button
                    type="button"
                    onClick={() => removePlateHistoryEntry(idx)}
                    className="px-3 py-2 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
                  >
                    Quitar
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addPlateHistoryEntry}
                className="px-3 py-2 text-sm border rounded hover:bg-gray-100"
              >
                + Agregar matrícula anterior
              </button>
            </div>
          )}
        </div>
      </Section>

      {/* Cláusulas adicionales */}
      <Section title="Cláusulas adicionales" defaultOpen={false}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label="Declaración de elección (ciudad/departamento)"
            value={form.election_declaration}
            onChange={(v) => set("election_declaration", v)}
            className="md:col-span-3"
            placeholder="Ej: ciudad de Montevideo"
          />
          <Checkbox
            label="Incluir cláusula de responsabilidad de tránsito"
            checked={form.has_traffic_responsibility_clause}
            onChange={(v) => set("has_traffic_responsibility_clause", v)}
          />
          {form.has_traffic_responsibility_clause && (
            <Input
              label="Fecha de responsabilidad"
              type="date"
              value={form.traffic_responsibility_date}
              onChange={(v) => set("traffic_responsibility_date", v)}
            />
          )}
        </div>
      </Section>

      {/* Protocolización */}
      <Section title="Protocolización y papel notarial" defaultOpen={false}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-3 text-sm text-gray-500 mb-2">
            Próximo número de matriz: <strong>{nextMatriz}</strong> — Próximo
            folio: <strong>{nextFolio}</strong>
          </div>
          <Input
            label="Serie papel (protocolo)"
            value={form.paper_series_proto}
            onChange={(v) => set("paper_series_proto", v)}
            placeholder="Ej: AO"
          />
          <Input
            label="Nro. papel (protocolo)"
            value={form.paper_number_proto}
            onChange={(v) => set("paper_number_proto", v)}
          />
          <Input
            label="Serie papel (testimonio)"
            value={form.paper_series_testimony}
            onChange={(v) => set("paper_series_testimony", v)}
          />
          <Input
            label="Nro(s). papel (testimonio)"
            value={form.paper_numbers_testimony}
            onChange={(v) => set("paper_numbers_testimony", v)}
            placeholder="Ej: 1234567 y 1234568"
          />
          <Input
            label="Fecha de la operación"
            type="date"
            value={form.transaction_date}
            onChange={(v) => set("transaction_date", v)}
          />
        </div>
      </Section>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 pb-8">
        <button
          onClick={() => saveTransaction("borrador")}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <Save size={16} />
          Guardar borrador
        </button>
        <button
          onClick={() => saveTransaction("completado")}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Save size={16} />
          Completar y generar Word
        </button>
      </div>
    </div>
  );
}
