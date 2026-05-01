"use client";

import { useState } from "react";
import { FileDown, Plus, Trash2 } from "lucide-react";

interface PersonState {
  full_name: string;
  ci_number: string;
  nationality: string;
  civil_status: string;
  nupcias_type: string;
  spouse_name: string;
  address: string;
  department: string;
}

interface FormState {
  ciudad: string;
  fecha: string;
  padron: string;
  padron_department: string;
  sellers: PersonState[];
  buyer: PersonState;
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
  price_amount_words: string;
  price_amount_number: string;
  price_currency_symbol: string;
  price_payment_method: string;
}

function defaultPerson(): PersonState {
  return {
    full_name: "",
    ci_number: "",
    nationality: "oriental",
    civil_status: "soltero",
    nupcias_type: "únicas",
    spouse_name: "",
    address: "",
    department: "",
  };
}

function defaultState(): FormState {
  return {
    ciudad: "",
    fecha: new Date().toISOString().split("T")[0],
    padron: "",
    padron_department: "",
    sellers: [defaultPerson()],
    buyer: defaultPerson(),
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
    price_amount_words: "",
    price_amount_number: "",
    price_currency_symbol: "U$S",
    price_payment_method: "en efectivo, en este acto",
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

function PersonSection({
  title,
  person,
  onChange,
}: {
  title: string;
  person: PersonState;
  onChange: (p: PersonState) => void;
}) {
  function set(field: keyof PersonState, value: string) {
    onChange({ ...person, [field]: value });
  }

  const isMarried = person.civil_status === "casado";
  const isDivorced = person.civil_status === "divorciado";

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {title}
      </div>
      <div className="col-span-2">
        {lbl("Nombre completo", true)}
        {inp(person.full_name, (v) => set("full_name", v), "", !person.full_name)}
      </div>
      <div>
        {lbl("Cédula de identidad", true)}
        {inp(person.ci_number, (v) => set("ci_number", v), "X.XXX.XXX-X", !person.ci_number)}
      </div>
      <div>
        {lbl("Nacionalidad")}
        {inp(person.nationality, (v) => set("nationality", v), "oriental")}
      </div>
      <div>
        {lbl("Estado civil")}
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={person.civil_status}
          onChange={(e) => set("civil_status", e.target.value)}
        >
          <option value="soltero">Soltero/a</option>
          <option value="casado">Casado/a</option>
          <option value="divorciado">Divorciado/a</option>
          <option value="viudo">Viudo/a</option>
        </select>
      </div>
      {(isMarried || isDivorced) && (
        <>
          <div>
            {lbl("Tipo de nupcias")}
            {inp(person.nupcias_type, (v) => set("nupcias_type", v), "únicas")}
          </div>
          <div className="col-span-2">
            {lbl("Nombre del cónyuge / ex-cónyuge")}
            {inp(person.spouse_name, (v) => set("spouse_name", v))}
          </div>
        </>
      )}
      <div className="col-span-2">
        {lbl("Domicilio")}
        {inp(person.address, (v) => set("address", v), "Calle y número")}
      </div>
      <div>
        {lbl("Departamento")}
        {inp(person.department, (v) => set("department", v), "Maldonado")}
      </div>
    </div>
  );
}

export default function CompromisoForm() {
  const [form, setForm] = useState<FormState>(defaultState());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField(field: keyof Omit<FormState, "sellers" | "buyer">, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function setSeller(idx: number, p: PersonState) {
    setForm((prev) => {
      const sellers = [...prev.sellers];
      sellers[idx] = p;
      return { ...prev, sellers };
    });
  }

  function addSeller() {
    if (form.sellers.length < 2) {
      setForm((prev) => ({ ...prev, sellers: [...prev.sellers, defaultPerson()] }));
    }
  }

  function removeSeller() {
    if (form.sellers.length > 1) {
      setForm((prev) => ({ ...prev, sellers: prev.sellers.slice(0, -1) }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const missing: string[] = [];
    if (!form.ciudad) missing.push("Ciudad");
    if (!form.fecha) missing.push("Fecha");
    form.sellers.forEach((s, i) => {
      if (!s.full_name) missing.push(`Nombre del vendedor ${i + 1}`);
      if (!s.ci_number) missing.push(`CI del vendedor ${i + 1}`);
    });
    if (!form.buyer.full_name) missing.push("Nombre del comprador");
    if (!form.buyer.ci_number) missing.push("CI del comprador");
    if (!form.vehicle_brand) missing.push("Marca del vehículo");
    if (!form.price_amount_words) missing.push("Precio en letras");
    if (!form.price_amount_number) missing.push("Precio en números");

    if (missing.length > 0) {
      setError(`Campos requeridos: ${missing.join(", ")}`);
      return;
    }

    setLoading(true);
    try {
      const body = {
        ciudad: form.ciudad,
        fecha: form.fecha,
        padron: form.padron || undefined,
        padron_department: form.padron_department || undefined,
        sellers: form.sellers.map((s) => ({
          full_name: s.full_name,
          ci_number: s.ci_number,
          nationality: s.nationality || undefined,
          civil_status: s.civil_status || undefined,
          nupcias_type: (s.civil_status === "casado" || s.civil_status === "divorciado") ? s.nupcias_type || undefined : undefined,
          spouse_name: (s.civil_status === "casado" || s.civil_status === "divorciado") ? s.spouse_name || undefined : undefined,
          address: s.address || undefined,
          department: s.department || undefined,
        })),
        buyer: {
          full_name: form.buyer.full_name,
          ci_number: form.buyer.ci_number,
          nationality: form.buyer.nationality || undefined,
          civil_status: form.buyer.civil_status || undefined,
          nupcias_type: (form.buyer.civil_status === "casado" || form.buyer.civil_status === "divorciado") ? form.buyer.nupcias_type || undefined : undefined,
          spouse_name: (form.buyer.civil_status === "casado" || form.buyer.civil_status === "divorciado") ? form.buyer.spouse_name || undefined : undefined,
          address: form.buyer.address || undefined,
          department: form.buyer.department || undefined,
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
        price: {
          amount_words: form.price_amount_words,
          amount_number: form.price_amount_number,
          currency_symbol: form.price_currency_symbol,
          payment_method: form.price_payment_method || undefined,
        },
      };

      const res = await fetch("/api/generate-word/compromiso", {
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
      a.download = `compromiso_${form.vehicle_plate || form.padron || "vehiculo"}_${form.fecha}.docx`;
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
        <h1 className="text-2xl font-bold text-gray-900">Compromiso de Compraventa</h1>
        <p className="text-sm text-gray-500 mt-1">
          Contrato de compromiso de compraventa de vehículo automotor
        </p>
      </div>

      {/* Datos generales */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Datos generales</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            {lbl("Ciudad", true)}
            {inp(form.ciudad, (v) => setField("ciudad", v), "Canelones", !form.ciudad)}
          </div>
          <div>
            {lbl("Fecha", true)}
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.fecha}
              onChange={(e) => setField("fecha", e.target.value)}
            />
          </div>
          <div>
            {lbl("Padrón del vehículo (encabezado)")}
            {inp(form.padron, (v) => setField("padron", v), "902937827")}
          </div>
          <div>
            {lbl("Departamento del padrón")}
            {inp(form.padron_department, (v) => setField("padron_department", v), "Canelones")}
          </div>
        </div>
      </section>

      {/* Vendedores */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Parte Promitente Vendedora</h2>
          <div className="flex gap-2">
            {form.sellers.length < 2 && (
              <button
                type="button"
                onClick={addSeller}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 px-2 py-1 border border-blue-200 rounded"
              >
                <Plus size={12} /> Agregar vendedor
              </button>
            )}
            {form.sellers.length > 1 && (
              <button
                type="button"
                onClick={removeSeller}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 px-2 py-1 border border-red-200 rounded"
              >
                <Trash2 size={12} /> Quitar
              </button>
            )}
          </div>
        </div>
        {form.sellers.map((seller, idx) => (
          <div key={idx} className={form.sellers.length > 1 ? "border-t pt-4" : ""}>
            <PersonSection
              title={form.sellers.length > 1 ? `Vendedor ${idx + 1}` : ""}
              person={seller}
              onChange={(p) => setSeller(idx, p)}
            />
          </div>
        ))}
      </section>

      {/* Comprador */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Parte Promitente Compradora</h2>
        <PersonSection
          title=""
          person={form.buyer}
          onChange={(p) => setForm((prev) => ({ ...prev, buyer: p }))}
        />
      </section>

      {/* Vehículo */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Vehículo</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            {lbl("Tipo")}
            {inp(form.vehicle_type, (v) => setField("vehicle_type", v), "SEDAN 4 PUERTAS")}
          </div>
          <div>
            {lbl("Marca", true)}
            {inp(form.vehicle_brand, (v) => setField("vehicle_brand", v), "HYUNDAI", !form.vehicle_brand)}
          </div>
          <div>
            {lbl("Modelo")}
            {inp(form.vehicle_model, (v) => setField("vehicle_model", v), "GRAND I10")}
          </div>
          <div>
            {lbl("Año")}
            {inp(form.vehicle_year, (v) => setField("vehicle_year", v), "2015")}
          </div>
          <div>
            {lbl("Padrón")}
            {inp(form.vehicle_padron, (v) => setField("vehicle_padron", v), "902937827")}
          </div>
          <div>
            {lbl("Departamento padrón")}
            {inp(form.vehicle_padron_department, (v) => setField("vehicle_padron_department", v), "Canelones")}
          </div>
          <div>
            {lbl("Matrícula")}
            {inp(form.vehicle_plate, (v) => setField("vehicle_plate", v), "AAO 6827")}
          </div>
          <div>
            {lbl("Departamento matrícula")}
            {inp(form.vehicle_plate_department, (v) => setField("vehicle_plate_department", v), "Canelones")}
          </div>
          <div>
            {lbl("Combustible")}
            {inp(form.vehicle_fuel, (v) => setField("vehicle_fuel", v), "Nafta")}
          </div>
          <div className="col-span-3">
            {lbl("Motor")}
            {inp(form.vehicle_motor, (v) => setField("vehicle_motor", v), "G4LAEM460339")}
          </div>
          <div className="col-span-3">
            {lbl("Chasis")}
            {inp(form.vehicle_chassis, (v) => setField("vehicle_chassis", v), "MALA741CAFM064697")}
          </div>
        </div>
      </section>

      {/* Precio */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Precio</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            {lbl("Precio en letras", true)}
            {inp(form.price_amount_words, (v) => setField("price_amount_words", v), "ocho mil quinientos", !form.price_amount_words)}
          </div>
          <div>
            {lbl("Precio en números", true)}
            {inp(form.price_amount_number, (v) => setField("price_amount_number", v), "8.500,oo", !form.price_amount_number)}
          </div>
          <div>
            {lbl("Moneda")}
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.price_currency_symbol}
              onChange={(e) => setField("price_currency_symbol", e.target.value)}
            >
              <option value="U$S">U$S (Dólares)</option>
              <option value="$">$ (Pesos uruguayos)</option>
            </select>
          </div>
          <div>
            {lbl("Forma de pago")}
            {inp(form.price_payment_method, (v) => setField("price_payment_method", v), "en efectivo, en este acto")}
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
        {loading ? "Generando..." : "Generar compromiso de compraventa"}
      </button>
    </form>
  );
}
