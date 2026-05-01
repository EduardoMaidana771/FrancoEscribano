"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";

interface FormState {
  // Generales
  ciudad: string;
  fecha: string;
  // Acreedor
  acreedor_type: "company" | "person";
  acreedor_company_name: string;
  acreedor_company_rut: string;
  acreedor_company_address: string;
  acreedor_company_rep_name: string;
  acreedor_company_rep_ci: string;
  acreedor_company_rep_nationality: string;
  acreedor_company_rep_role: string;
  acreedor_full_name: string;
  acreedor_ci: string;
  acreedor_nationality: string;
  acreedor_civil_status: string;
  acreedor_address: string;
  acreedor_department: string;
  // Deudor
  deudor_full_name: string;
  deudor_ci: string;
  deudor_nationality: string;
  deudor_civil_status: string;
  deudor_nupcias_type: string;
  deudor_spouse_name: string;
  deudor_civil_arrangement: string;
  deudor_address: string;
  deudor_department: string;
  // Préstamo
  loan_total_amount_words: string;
  loan_total_amount_number: string;
  loan_cuotas_count_words: string;
  loan_cuota_amount_words: string;
  loan_cuota_amount_number: string;
  loan_first_due_text: string;
  loan_day_of_month_text: string;
  loan_bank_payment_info: string;
  // Vehículo
  vehicle_type: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_year: string;
  vehicle_padron: string;
  vehicle_padron_department: string;
  vehicle_plate: string;
  vehicle_plate_department: string;
  vehicle_motor: string;
  vehicle_fuel: string;
  vehicle_chassis: string;
  // Escribano
  notary_name: string;
  notary_gender: "f" | "m";
}

function defaultState(): FormState {
  return {
    ciudad: "",
    fecha: new Date().toISOString().split("T")[0],
    acreedor_type: "company",
    acreedor_company_name: "",
    acreedor_company_rut: "",
    acreedor_company_address: "",
    acreedor_company_rep_name: "",
    acreedor_company_rep_ci: "",
    acreedor_company_rep_nationality: "argentino",
    acreedor_company_rep_role: "socio administrador",
    acreedor_full_name: "",
    acreedor_ci: "",
    acreedor_nationality: "oriental",
    acreedor_civil_status: "soltero",
    acreedor_address: "",
    acreedor_department: "",
    deudor_full_name: "",
    deudor_ci: "",
    deudor_nationality: "oriental",
    deudor_civil_status: "soltero",
    deudor_nupcias_type: "únicas",
    deudor_spouse_name: "",
    deudor_civil_arrangement: "separado de bienes por capitulaciones matrimoniales",
    deudor_address: "",
    deudor_department: "",
    loan_total_amount_words: "",
    loan_total_amount_number: "",
    loan_cuotas_count_words: "",
    loan_cuota_amount_words: "",
    loan_cuota_amount_number: "",
    loan_first_due_text: "",
    loan_day_of_month_text: "",
    loan_bank_payment_info: "",
    vehicle_type: "",
    vehicle_brand: "",
    vehicle_model: "",
    vehicle_year: "",
    vehicle_padron: "",
    vehicle_padron_department: "",
    vehicle_plate: "",
    vehicle_plate_department: "",
    vehicle_motor: "",
    vehicle_fuel: "Nafta",
    vehicle_chassis: "",
    notary_name: "",
    notary_gender: "f",
  };
}

function inp(
  value: string,
  onChange: (v: string) => void,
  placeholder = "",
  error = false
) {
  return (
    <input
      className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        error ? "border-red-400" : "border-gray-300"
      }`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function lbl(text: string, required = false) {
  return (
    <label className="block text-xs font-medium text-gray-700 mb-1">
      {text}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function sel(
  value: string,
  onChange: (v: string) => void,
  options: { value: string; label: string }[]
) {
  return (
    <select
      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export default function PrendaForm() {
  const [form, setForm] = useState<FormState>(defaultState());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const missing: string[] = [];
    if (!form.ciudad) missing.push("Ciudad");
    if (!form.fecha) missing.push("Fecha");
    if (form.acreedor_type === "company") {
      if (!form.acreedor_company_name) missing.push("Nombre de la empresa acreedora");
    } else {
      if (!form.acreedor_full_name) missing.push("Nombre del acreedor");
      if (!form.acreedor_ci) missing.push("CI del acreedor");
    }
    if (!form.deudor_full_name) missing.push("Nombre del deudor");
    if (!form.deudor_ci) missing.push("CI del deudor");
    if (!form.loan_total_amount_words) missing.push("Monto total en letras");
    if (!form.loan_total_amount_number) missing.push("Monto total en números");
    if (!form.loan_cuotas_count_words) missing.push("Cantidad de cuotas");
    if (!form.loan_cuota_amount_words) missing.push("Monto de cuota en letras");
    if (!form.loan_cuota_amount_number) missing.push("Monto de cuota en números");
    if (!form.loan_first_due_text) missing.push("Vencimiento primera cuota");
    if (!form.loan_day_of_month_text) missing.push("Día de vencimiento mensual");
    if (!form.vehicle_brand) missing.push("Marca del vehículo");
    if (!form.notary_name) missing.push("Nombre del escribano/a");

    if (missing.length > 0) {
      setError(`Campos requeridos: ${missing.join(", ")}`);
      return;
    }

    setLoading(true);
    try {
      const body = {
        ciudad: form.ciudad,
        fecha: form.fecha,
        acreedor:
          form.acreedor_type === "company"
            ? {
                type: "company",
                company_name: form.acreedor_company_name,
                company_rut: form.acreedor_company_rut || undefined,
                company_address: form.acreedor_company_address || undefined,
                company_rep_name: form.acreedor_company_rep_name || undefined,
                company_rep_ci: form.acreedor_company_rep_ci || undefined,
                company_rep_nationality: form.acreedor_company_rep_nationality || undefined,
                company_rep_role: form.acreedor_company_rep_role || undefined,
              }
            : {
                type: "person",
                full_name: form.acreedor_full_name,
                ci_number: form.acreedor_ci,
                nationality: form.acreedor_nationality || undefined,
                civil_status: form.acreedor_civil_status || undefined,
                address: form.acreedor_address || undefined,
                department: form.acreedor_department || undefined,
              },
        deudor: {
          full_name: form.deudor_full_name,
          ci_number: form.deudor_ci,
          nationality: form.deudor_nationality || undefined,
          civil_status: form.deudor_civil_status || undefined,
          nupcias_type: form.deudor_civil_status === "casado" ? form.deudor_nupcias_type || undefined : undefined,
          spouse_name: form.deudor_civil_status === "casado" ? form.deudor_spouse_name || undefined : undefined,
          civil_arrangement: form.deudor_civil_status === "casado" && form.deudor_civil_arrangement ? form.deudor_civil_arrangement : undefined,
          address: form.deudor_address || undefined,
          department: form.deudor_department || undefined,
        },
        loan: {
          total_amount_words: form.loan_total_amount_words,
          total_amount_number: form.loan_total_amount_number,
          cuotas_count_words: form.loan_cuotas_count_words,
          cuota_amount_words: form.loan_cuota_amount_words,
          cuota_amount_number: form.loan_cuota_amount_number,
          first_due_text: form.loan_first_due_text,
          day_of_month_text: form.loan_day_of_month_text,
          bank_payment_info: form.loan_bank_payment_info || undefined,
        },
        vehicle: {
          type: form.vehicle_type || undefined,
          brand: form.vehicle_brand,
          model: form.vehicle_model || undefined,
          year: form.vehicle_year ? parseInt(form.vehicle_year) : undefined,
          padron: form.vehicle_padron || undefined,
          padron_department: form.vehicle_padron_department || undefined,
          plate: form.vehicle_plate || undefined,
          plate_department: form.vehicle_plate_department || undefined,
          motor_number: form.vehicle_motor || undefined,
          fuel: form.vehicle_fuel || undefined,
          chassis_number: form.vehicle_chassis || undefined,
        },
        notary_name: form.notary_name,
        notary_gender: form.notary_gender,
      };

      const res = await fetch("/api/generate-word/prenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(err.error ?? "Error al generar documento");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prenda_${form.vehicle_plate || form.vehicle_padron || "vehiculo"}_${form.fecha}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar documento");
    } finally {
      setLoading(false);
    }
  }

  const isMarried = form.deudor_civil_status === "casado";

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Prenda de Vehículo Automotor</h1>
        <p className="text-sm text-gray-500 mt-1">
          Contrato de prenda sin desplazamiento de la tenencia
        </p>
      </div>

      {/* Datos generales */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Datos generales</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            {lbl("Ciudad", true)}
            {inp(form.ciudad, (v) => set("ciudad", v), "Maldonado", !form.ciudad)}
          </div>
          <div>
            {lbl("Fecha", true)}
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.fecha}
              onChange={(e) => set("fecha", e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Parte Acreedora */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Parte Acreedora</h2>
        <div>
          {lbl("Tipo de acreedor")}
          {sel(form.acreedor_type, (v) => set("acreedor_type", v as "company" | "person"), [
            { value: "company", label: "Empresa / Persona jurídica" },
            { value: "person", label: "Persona física" },
          ])}
        </div>

        {form.acreedor_type === "company" ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              {lbl("Nombre de la empresa", true)}
              {inp(form.acreedor_company_name, (v) => set("acreedor_company_name", v), "CRÉDITO CELESTE S.A.S.", !form.acreedor_company_name)}
            </div>
            <div>
              {lbl("RUT")}
              {inp(form.acreedor_company_rut, (v) => set("acreedor_company_rut", v), "070276610017")}
            </div>
            <div>
              {lbl("Domicilio de la empresa")}
              {inp(form.acreedor_company_address, (v) => set("acreedor_company_address", v), "Departamento de Maldonado...")}
            </div>
            <div className="col-span-2">
              {lbl("Nombre del representante")}
              {inp(form.acreedor_company_rep_name, (v) => set("acreedor_company_rep_name", v), "Nombre completo del representante")}
            </div>
            <div>
              {lbl("CI del representante")}
              {inp(form.acreedor_company_rep_ci, (v) => set("acreedor_company_rep_ci", v), "X.XXX.XXX-X")}
            </div>
            <div>
              {lbl("Nacionalidad del representante")}
              {inp(form.acreedor_company_rep_nationality, (v) => set("acreedor_company_rep_nationality", v), "argentino")}
            </div>
            <div>
              {lbl("Cargo del representante")}
              {inp(form.acreedor_company_rep_role, (v) => set("acreedor_company_rep_role", v), "socio administrador")}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              {lbl("Nombre completo", true)}
              {inp(form.acreedor_full_name, (v) => set("acreedor_full_name", v), "", !form.acreedor_full_name)}
            </div>
            <div>
              {lbl("Cédula de identidad", true)}
              {inp(form.acreedor_ci, (v) => set("acreedor_ci", v), "X.XXX.XXX-X", !form.acreedor_ci)}
            </div>
            <div>
              {lbl("Nacionalidad")}
              {inp(form.acreedor_nationality, (v) => set("acreedor_nationality", v), "oriental")}
            </div>
            <div>
              {lbl("Domicilio")}
              {inp(form.acreedor_address, (v) => set("acreedor_address", v))}
            </div>
            <div>
              {lbl("Departamento")}
              {inp(form.acreedor_department, (v) => set("acreedor_department", v))}
            </div>
          </div>
        )}
      </section>

      {/* Parte Deudora */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Parte Deudora</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            {lbl("Nombre completo", true)}
            {inp(form.deudor_full_name, (v) => set("deudor_full_name", v), "", !form.deudor_full_name)}
          </div>
          <div>
            {lbl("Cédula de identidad", true)}
            {inp(form.deudor_ci, (v) => set("deudor_ci", v), "X.XXX.XXX-X", !form.deudor_ci)}
          </div>
          <div>
            {lbl("Nacionalidad")}
            {inp(form.deudor_nationality, (v) => set("deudor_nationality", v), "oriental")}
          </div>
          <div>
            {lbl("Estado civil")}
            {sel(form.deudor_civil_status, (v) => set("deudor_civil_status", v), [
              { value: "soltero", label: "Soltero/a" },
              { value: "casado", label: "Casado/a" },
              { value: "divorciado", label: "Divorciado/a" },
              { value: "viudo", label: "Viudo/a" },
            ])}
          </div>
          {isMarried && (
            <>
              <div>
                {lbl("Tipo de nupcias")}
                {inp(form.deudor_nupcias_type, (v) => set("deudor_nupcias_type", v), "únicas")}
              </div>
              <div className="col-span-2">
                {lbl("Nombre del cónyuge")}
                {inp(form.deudor_spouse_name, (v) => set("deudor_spouse_name", v), "Nombre completo del cónyuge")}
              </div>
              <div className="col-span-2">
                {lbl("Régimen patrimonial")}
                {inp(form.deudor_civil_arrangement, (v) => set("deudor_civil_arrangement", v), "separado de bienes por capitulaciones matrimoniales")}
              </div>
            </>
          )}
          <div className="col-span-2">
            {lbl("Domicilio")}
            {inp(form.deudor_address, (v) => set("deudor_address", v), "Calle y número")}
          </div>
          <div>
            {lbl("Departamento")}
            {inp(form.deudor_department, (v) => set("deudor_department", v), "Maldonado")}
          </div>
        </div>
      </section>

      {/* Préstamo */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Términos del préstamo</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            {lbl("Monto total en letras", true)}
            {inp(form.loan_total_amount_words, (v) => set("loan_total_amount_words", v), "once mil cuatrocientos doce", !form.loan_total_amount_words)}
          </div>
          <div>
            {lbl("Monto total en números", true)}
            {inp(form.loan_total_amount_number, (v) => set("loan_total_amount_number", v), "U$S 11.412,oo", !form.loan_total_amount_number)}
          </div>
          <div className="col-span-2">
            {lbl("Cantidad de cuotas (ej: treinta y seis (36))", true)}
            {inp(form.loan_cuotas_count_words, (v) => set("loan_cuotas_count_words", v), "treinta y seis (36)", !form.loan_cuotas_count_words)}
          </div>
          <div>
            {lbl("Cuota en letras", true)}
            {inp(form.loan_cuota_amount_words, (v) => set("loan_cuota_amount_words", v), "trescientos diecisiete", !form.loan_cuota_amount_words)}
          </div>
          <div>
            {lbl("Cuota en números", true)}
            {inp(form.loan_cuota_amount_number, (v) => set("loan_cuota_amount_number", v), "U$S 317,oo", !form.loan_cuota_amount_number)}
          </div>
          <div>
            {lbl("Vencimiento primera cuota", true)}
            {inp(form.loan_first_due_text, (v) => set("loan_first_due_text", v), "14 de enero de 2025", !form.loan_first_due_text)}
          </div>
          <div>
            {lbl("Día de vencimiento mensual (en letras)", true)}
            {inp(form.loan_day_of_month_text, (v) => set("loan_day_of_month_text", v), "catorce", !form.loan_day_of_month_text)}
          </div>
          <div className="col-span-2">
            {lbl("Información de pago (cuenta bancaria, etc.)")}
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              value={form.loan_bank_payment_info}
              onChange={(e) => set("loan_bank_payment_info", e.target.value)}
              placeholder="Las referidas cuotas deben abonarse mediante acreditación en..."
            />
          </div>
        </div>
      </section>

      {/* Vehículo */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Vehículo prendado</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            {lbl("Tipo")}
            {inp(form.vehicle_type, (v) => set("vehicle_type", v), "SEDÁN 5 PUERTAS")}
          </div>
          <div>
            {lbl("Marca", true)}
            {inp(form.vehicle_brand, (v) => set("vehicle_brand", v), "RENAULT", !form.vehicle_brand)}
          </div>
          <div>
            {lbl("Modelo")}
            {inp(form.vehicle_model, (v) => set("vehicle_model", v), "KWID INTENSE 1.0 MT")}
          </div>
          <div>
            {lbl("Año")}
            {inp(form.vehicle_year, (v) => set("vehicle_year", v), "2020")}
          </div>
          <div>
            {lbl("Padrón")}
            {inp(form.vehicle_padron, (v) => set("vehicle_padron", v), "903307627")}
          </div>
          <div>
            {lbl("Departamento padrón")}
            {inp(form.vehicle_padron_department, (v) => set("vehicle_padron_department", v), "Canelones")}
          </div>
          <div>
            {lbl("Matrícula")}
            {inp(form.vehicle_plate, (v) => set("vehicle_plate", v), "AAV 2217")}
          </div>
          <div>
            {lbl("Departamento matrícula")}
            {inp(form.vehicle_plate_department, (v) => set("vehicle_plate_department", v), "Canelones")}
          </div>
          <div>
            {lbl("Combustible")}
            {inp(form.vehicle_fuel, (v) => set("vehicle_fuel", v), "Nafta")}
          </div>
          <div className="col-span-3">
            {lbl("Motor")}
            {inp(form.vehicle_motor, (v) => set("vehicle_motor", v), "B4DA405Q041855")}
          </div>
          <div className="col-span-3">
            {lbl("Chasis")}
            {inp(form.vehicle_chassis, (v) => set("vehicle_chassis", v), "93YRBB001LJ911546")}
          </div>
        </div>
      </section>

      {/* Escribano */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Escribano/a certificante</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            {lbl("Nombre del/la escribano/a", true)}
            {inp(form.notary_name, (v) => set("notary_name", v), "Nombre del escribano/a", !form.notary_name)}
          </div>
          <div>
            {lbl("Género")}
            {sel(form.notary_gender, (v) => set("notary_gender", v as "f" | "m"), [
              { value: "f", label: "Escribana (femenino)" },
              { value: "m", label: "Escribano (masculino)" },
            ])}
          </div>
        </div>
      </section>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-md transition-colors"
      >
        <FileDown size={18} />
        {loading ? "Generando..." : "Generar prenda"}
      </button>
    </form>
  );
}
