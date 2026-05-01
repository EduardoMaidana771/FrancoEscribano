"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";

interface FormState {
  // Generales
  ciudad: string;
  fecha: string;
  // Vehículo
  plate: string;
  padron: string;
  padron_department: string;
  // Compareciente
  comp_full_name: string;
  comp_ci: string;
  comp_nationality: string;
  comp_civil_status: string;
  comp_address: string;
  comp_department: string;
  comp_is_known: boolean;
  // Apoderado
  has_apoderado: boolean;
  poder_poderdante_name: string;
  poder_poderdante_ci: string;
  poder_poderdante_address: string;
  poder_type: string;
  poder_date: string;
  poder_protocol_date: string;
  poder_notary: string;
}

function defaultState(): FormState {
  return {
    ciudad: "",
    fecha: new Date().toISOString().split("T")[0],
    plate: "",
    padron: "",
    padron_department: "",
    comp_full_name: "",
    comp_ci: "",
    comp_nationality: "oriental",
    comp_civil_status: "soltero",
    comp_address: "",
    comp_department: "",
    comp_is_known: false,
    has_apoderado: false,
    poder_poderdante_name: "",
    poder_poderdante_ci: "",
    poder_poderdante_address: "",
    poder_type: "carta poder",
    poder_date: "",
    poder_protocol_date: "",
    poder_notary: "",
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

export default function CertificacionImmForm() {
  const [form, setForm] = useState<FormState>(defaultState());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof FormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const missing: string[] = [];
    if (!form.ciudad) missing.push("Ciudad");
    if (!form.fecha) missing.push("Fecha");
    if (!form.plate) missing.push("Matrícula");
    if (!form.padron) missing.push("Padrón");
    if (!form.padron_department) missing.push("Departamento de padrón");
    if (!form.comp_full_name) missing.push("Nombre del compareciente");
    if (!form.comp_ci) missing.push("CI del compareciente");
    if (form.has_apoderado) {
      if (!form.poder_poderdante_name) missing.push("Nombre del poderdante");
      if (!form.poder_poderdante_ci) missing.push("CI del poderdante");
      if (!form.poder_date) missing.push("Fecha de la carta poder");
      if (!form.poder_notary) missing.push("Escribano de la carta poder");
    }

    if (missing.length > 0) {
      setError(`Campos requeridos: ${missing.join(", ")}`);
      return;
    }

    setLoading(true);
    try {
      const body = {
        ciudad: form.ciudad,
        fecha: form.fecha,
        vehicle: {
          plate: form.plate,
          padron: form.padron,
          padron_department: form.padron_department,
        },
        compareciente: {
          full_name: form.comp_full_name,
          ci_number: form.comp_ci,
          nationality: form.comp_nationality || undefined,
          civil_status: form.comp_civil_status || undefined,
          address: form.comp_address || undefined,
          department: form.comp_department || undefined,
          is_known: form.comp_is_known,
        },
        apoderado: form.has_apoderado
          ? {
              poderdante_name: form.poder_poderdante_name,
              poderdante_ci: form.poder_poderdante_ci,
              poderdante_address: form.poder_poderdante_address || undefined,
              power_type: form.poder_type,
              power_date: form.poder_date,
              power_protocol_date: form.poder_protocol_date || undefined,
              power_notary: form.poder_notary,
            }
          : undefined,
      };

      const res = await fetch("/api/generate-word/certificacion-imm", {
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
      a.download = `certificacion_imm_${form.plate}_${form.fecha}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar documento");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Certificación de Firma IMM</h1>
        <p className="text-sm text-gray-500 mt-1">
          Certificación notarial para presentación ante intendencia
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

      {/* Vehículo */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Vehículo</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            {lbl("Matrícula", true)}
            {inp(form.plate, (v) => set("plate", v), "ABC1234", !form.plate)}
          </div>
          <div>
            {lbl("Padrón", true)}
            {inp(form.padron, (v) => set("padron", v), "903213772", !form.padron)}
          </div>
          <div>
            {lbl("Departamento padrón", true)}
            {inp(
              form.padron_department,
              (v) => set("padron_department", v),
              "Canelones",
              !form.padron_department
            )}
          </div>
        </div>
      </section>

      {/* Compareciente */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Compareciente</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            {lbl("Nombre completo", true)}
            {inp(form.comp_full_name, (v) => set("comp_full_name", v), "", !form.comp_full_name)}
          </div>
          <div>
            {lbl("Cédula de identidad", true)}
            {inp(form.comp_ci, (v) => set("comp_ci", v), "X.XXX.XXX-X", !form.comp_ci)}
          </div>
          <div>
            {lbl("Nacionalidad")}
            {inp(form.comp_nationality, (v) => set("comp_nationality", v), "oriental")}
          </div>
          <div>
            {lbl("Estado civil")}
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.comp_civil_status}
              onChange={(e) => set("comp_civil_status", e.target.value)}
            >
              <option value="soltero">Soltero/a</option>
              <option value="casado">Casado/a</option>
              <option value="divorciado">Divorciado/a</option>
              <option value="viudo">Viudo/a</option>
            </select>
          </div>
          <div className="col-span-2">
            {lbl("Domicilio a estos efectos")}
            {inp(form.comp_address, (v) => set("comp_address", v), "Calle y número")}
          </div>
          <div>
            {lbl("Departamento")}
            {inp(form.comp_department, (v) => set("comp_department", v), "Canelones")}
          </div>
          <div className="flex items-center gap-2 mt-5">
            <input
              type="checkbox"
              id="is_known"
              checked={form.comp_is_known}
              onChange={(e) => set("comp_is_known", e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="is_known" className="text-sm text-gray-700">
              Persona de mi conocimiento
            </label>
          </div>
        </div>
      </section>

      {/* Apoderado (sección II) */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="has_apoderado"
            checked={form.has_apoderado}
            onChange={(e) => set("has_apoderado", e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
          />
          <label htmlFor="has_apoderado" className="text-base font-semibold text-gray-900">
            Actúa como apoderado (sección II)
          </label>
        </div>

        {form.has_apoderado && (
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="col-span-2">
              {lbl("Nombre del poderdante", true)}
              {inp(
                form.poder_poderdante_name,
                (v) => set("poder_poderdante_name", v),
                "",
                !form.poder_poderdante_name
              )}
            </div>
            <div>
              {lbl("CI del poderdante", true)}
              {inp(
                form.poder_poderdante_ci,
                (v) => set("poder_poderdante_ci", v),
                "X.XXX.XXX-X",
                !form.poder_poderdante_ci
              )}
            </div>
            <div>
              {lbl("Domicilio del poderdante")}
              {inp(form.poder_poderdante_address, (v) => set("poder_poderdante_address", v))}
            </div>
            <div>
              {lbl("Tipo de poder")}
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.poder_type}
                onChange={(e) => set("poder_type", e.target.value)}
              >
                <option value="carta poder">Carta poder</option>
                <option value="escritura pública de Poder General">Poder General</option>
                <option value="escritura pública de Poder Especial">Poder Especial</option>
                <option value="submandato">Submandato</option>
              </select>
            </div>
            <div>
              {lbl("Fecha del poder", true)}
              <input
                type="date"
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  !form.poder_date ? "border-red-400" : "border-gray-300"
                }`}
                value={form.poder_date}
                onChange={(e) => set("poder_date", e.target.value)}
              />
            </div>
            <div>
              {lbl("Fecha de protocolización (si difiere)")}
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.poder_protocol_date}
                onChange={(e) => set("poder_protocol_date", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              {lbl("Escribano/a que certificó", true)}
              {inp(
                form.poder_notary,
                (v) => set("poder_notary", v),
                "Nombre del escribano",
                !form.poder_notary
              )}
            </div>
          </div>
        )}
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
        {loading ? "Generando..." : "Generar certificación IMM"}
      </button>
    </form>
  );
}
