"use client";

import { useState } from "react";
import { FileDown, Plus, Trash2 } from "lucide-react";

interface PersonData {
  full_name: string;
  ci_number: string;
  nationality: string;
  civil_status: string;
  nupcias_type: string;
  spouse_name: string;
  address: string;
  department: string;
}

function emptyPerson(): PersonData {
  return {
    full_name: "",
    ci_number: "",
    nationality: "oriental",
    civil_status: "soltero",
    nupcias_type: "",
    spouse_name: "",
    address: "",
    department: "",
  };
}

interface FormState {
  ciudad: string;
  fecha: string;
  hora: string;
  sellers: PersonData[];
  buyer: PersonData;
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
  price_amount: string;
  price_currency: "USD" | "UYU";
  price_in_words: string;
}

function defaultState(): FormState {
  return {
    ciudad: "",
    fecha: new Date().toISOString().split("T")[0],
    hora: "",
    sellers: [emptyPerson()],
    buyer: emptyPerson(),
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
    price_amount: "",
    price_currency: "USD",
    price_in_words: "",
  };
}

function inputClass(error?: boolean) {
  return `w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    error ? "border-red-400" : "border-gray-300"
  }`;
}

function label(text: string, required = false) {
  return (
    <label className="block text-xs font-medium text-gray-700 mb-1">
      {text} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

function PersonSection({
  title,
  data,
  onChange,
}: {
  title: string;
  data: PersonData;
  onChange: (updated: PersonData) => void;
}) {
  function set(field: keyof PersonData, value: string) {
    onChange({ ...data, [field]: value });
  }
  const showNupcias = data.civil_status === "casado" || data.civil_status === "separado_bienes";

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          {label("Nombre completo", true)}
          <input
            className={inputClass(!data.full_name)}
            value={data.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            placeholder="Nombre completo"
          />
        </div>
        <div>
          {label("Cédula de identidad", true)}
          <input
            className={inputClass(!data.ci_number)}
            value={data.ci_number}
            onChange={(e) => set("ci_number", e.target.value)}
            placeholder="X.XXX.XXX-X"
          />
        </div>
        <div>
          {label("Nacionalidad")}
          <input
            className={inputClass()}
            value={data.nationality}
            onChange={(e) => set("nationality", e.target.value)}
            placeholder="oriental"
          />
        </div>
        <div>
          {label("Estado civil")}
          <select
            className={inputClass()}
            value={data.civil_status}
            onChange={(e) => set("civil_status", e.target.value)}
          >
            <option value="soltero">Soltero/a</option>
            <option value="casado">Casado/a</option>
            <option value="divorciado">Divorciado/a</option>
            <option value="viudo">Viudo/a</option>
            <option value="separado_bienes">Separación de bienes</option>
          </select>
        </div>
        {showNupcias && (
          <>
            <div>
              {label("Nupcias")}
              <select
                className={inputClass()}
                value={data.nupcias_type}
                onChange={(e) => set("nupcias_type", e.target.value)}
              >
                <option value="">— seleccionar —</option>
                <option value="unicas">Únicas</option>
                <option value="primeras">Primeras</option>
                <option value="segundas">Segundas</option>
                <option value="terceras">Terceras</option>
              </select>
            </div>
            <div className="col-span-2">
              {label("Nombre del cónyuge")}
              <input
                className={inputClass()}
                value={data.spouse_name}
                onChange={(e) => set("spouse_name", e.target.value)}
              />
            </div>
          </>
        )}
        <div className="col-span-2">
          {label("Domicilio")}
          <input
            className={inputClass()}
            value={data.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Calle y número"
          />
        </div>
        <div>
          {label("Departamento")}
          <input
            className={inputClass()}
            value={data.department}
            onChange={(e) => set("department", e.target.value)}
            placeholder="Montevideo"
          />
        </div>
      </div>
    </div>
  );
}

export default function CartaDeslindeForm() {
  const [form, setForm] = useState<FormState>(defaultState());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateSeller(index: number, updated: PersonData) {
    const sellers = [...form.sellers];
    sellers[index] = updated;
    setForm({ ...form, sellers });
  }

  function addSeller() {
    if (form.sellers.length < 2) {
      setForm({ ...form, sellers: [...form.sellers, emptyPerson()] });
    }
  }

  function removeSeller(index: number) {
    setForm({ ...form, sellers: form.sellers.filter((_, i) => i !== index) });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const missing = [];
    if (!form.ciudad) missing.push("Ciudad");
    if (!form.fecha) missing.push("Fecha");
    if (!form.sellers[0]?.full_name) missing.push("Nombre del vendedor");
    if (!form.sellers[0]?.ci_number) missing.push("CI del vendedor");
    if (!form.buyer.full_name) missing.push("Nombre del comprador");
    if (!form.buyer.ci_number) missing.push("CI del comprador");
    if (!form.vehicle_brand) missing.push("Marca del vehículo");
    if (!form.vehicle_model) missing.push("Modelo del vehículo");
    if (!form.price_amount) missing.push("Precio");
    if (!form.price_in_words) missing.push("Precio en letras");

    if (missing.length > 0) {
      setError(`Campos requeridos: ${missing.join(", ")}`);
      return;
    }

    setLoading(true);
    try {
      const body = {
        ciudad: form.ciudad,
        fecha: form.fecha,
        hora: form.hora || undefined,
        sellers: form.sellers.map((s) => ({
          full_name: s.full_name,
          ci_number: s.ci_number,
          nationality: s.nationality || undefined,
          civil_status: s.civil_status || undefined,
          nupcias_type: s.nupcias_type || undefined,
          spouse_name: s.spouse_name || undefined,
          address: s.address || undefined,
          department: s.department || undefined,
        })),
        buyer: {
          full_name: form.buyer.full_name,
          ci_number: form.buyer.ci_number,
          nationality: form.buyer.nationality || undefined,
          civil_status: form.buyer.civil_status || undefined,
          nupcias_type: form.buyer.nupcias_type || undefined,
          spouse_name: form.buyer.spouse_name || undefined,
          address: form.buyer.address || undefined,
          department: form.buyer.department || undefined,
        },
        vehicle: {
          type: form.vehicle_type || undefined,
          brand: form.vehicle_brand,
          model: form.vehicle_model,
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
          amount: parseFloat(form.price_amount),
          currency: form.price_currency,
          in_words: form.price_in_words,
        },
      };

      const res = await fetch("/api/generate-word/carta-deslinde", {
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
      const plate = form.vehicle_plate || "sin_matricula";
      a.href = url;
      a.download = `carta_deslinde_${plate}_${form.fecha}.docx`;
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
        <h1 className="text-2xl font-bold text-gray-900">Carta de Deslinde</h1>
        <p className="text-sm text-gray-500 mt-1">Generá la carta de deslinde de responsabilidad</p>
      </div>

      {/* Datos generales */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Datos generales</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1">
            {label("Ciudad", true)}
            <input
              className={inputClass(!form.ciudad)}
              value={form.ciudad}
              onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
              placeholder="Maldonado"
            />
          </div>
          <div>
            {label("Fecha", true)}
            <input
              type="date"
              className={inputClass()}
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            />
          </div>
          <div>
            {label("Hora de entrega")}
            <input
              type="time"
              className={inputClass()}
              value={form.hora}
              onChange={(e) => setForm({ ...form, hora: e.target.value })}
              placeholder="____"
            />
          </div>
        </div>
      </section>

      {/* Vendedor(es) */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Vendedor(es)</h2>
          {form.sellers.length < 2 && (
            <button
              type="button"
              onClick={addSeller}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
            >
              <Plus size={14} /> Agregar co-vendedor
            </button>
          )}
        </div>
        {form.sellers.map((seller, i) => (
          <div key={i} className="relative">
            {i > 0 && (
              <button
                type="button"
                onClick={() => removeSeller(i)}
                className="absolute top-0 right-0 text-red-400 hover:text-red-600"
              >
                <Trash2 size={14} />
              </button>
            )}
            <PersonSection
              title={form.sellers.length > 1 ? `Vendedor ${i + 1}` : "Vendedor"}
              data={seller}
              onChange={(u) => updateSeller(i, u)}
            />
          </div>
        ))}
      </section>

      {/* Comprador */}
      <section className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">Comprador</h2>
        </div>
        <PersonSection
          title=""
          data={form.buyer}
          onChange={(u) => setForm({ ...form, buyer: u })}
        />
      </section>

      {/* Vehículo */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Vehículo</h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            {label("Tipo")}
            <input
              className={inputClass()}
              value={form.vehicle_type}
              onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
              placeholder="SEDAN 4 PUERTAS"
            />
          </div>
          <div>
            {label("Marca", true)}
            <input
              className={inputClass(!form.vehicle_brand)}
              value={form.vehicle_brand}
              onChange={(e) => setForm({ ...form, vehicle_brand: e.target.value })}
              placeholder="FORD"
            />
          </div>
          <div>
            {label("Modelo", true)}
            <input
              className={inputClass(!form.vehicle_model)}
              value={form.vehicle_model}
              onChange={(e) => setForm({ ...form, vehicle_model: e.target.value })}
              placeholder="FIESTA"
            />
          </div>
          <div>
            {label("Año")}
            <input
              className={inputClass()}
              value={form.vehicle_year}
              onChange={(e) => setForm({ ...form, vehicle_year: e.target.value })}
              placeholder="2020"
            />
          </div>
          <div>
            {label("Padrón")}
            <input
              className={inputClass()}
              value={form.vehicle_padron}
              onChange={(e) => setForm({ ...form, vehicle_padron: e.target.value })}
            />
          </div>
          <div>
            {label("Dpto. padrón")}
            <input
              className={inputClass()}
              value={form.vehicle_padron_department}
              onChange={(e) => setForm({ ...form, vehicle_padron_department: e.target.value })}
              placeholder="CANELONES"
            />
          </div>
          <div>
            {label("Matrícula")}
            <input
              className={inputClass()}
              value={form.vehicle_plate}
              onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value })}
              placeholder="ABC1234"
            />
          </div>
          <div>
            {label("Dpto. matrícula")}
            <input
              className={inputClass()}
              value={form.vehicle_plate_department}
              onChange={(e) => setForm({ ...form, vehicle_plate_department: e.target.value })}
              placeholder="CANELONES"
            />
          </div>
          <div>
            {label("Combustible")}
            <select
              className={inputClass()}
              value={form.vehicle_fuel}
              onChange={(e) => setForm({ ...form, vehicle_fuel: e.target.value })}
            >
              <option>Nafta</option>
              <option>Gasoil</option>
              <option>Gas</option>
              <option>Eléctrico</option>
              <option>Híbrido</option>
            </select>
          </div>
          <div>
            {label("Motor")}
            <input
              className={inputClass()}
              value={form.vehicle_motor}
              onChange={(e) => setForm({ ...form, vehicle_motor: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            {label("Chasis")}
            <input
              className={inputClass()}
              value={form.vehicle_chassis}
              onChange={(e) => setForm({ ...form, vehicle_chassis: e.target.value })}
            />
          </div>
        </div>
      </section>

      {/* Precio */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Precio</h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            {label("Moneda")}
            <select
              className={inputClass()}
              value={form.price_currency}
              onChange={(e) =>
                setForm({ ...form, price_currency: e.target.value as "USD" | "UYU" })
              }
            >
              <option value="USD">USD (dólares)</option>
              <option value="UYU">UYU (pesos)</option>
            </select>
          </div>
          <div>
            {label("Monto", true)}
            <input
              type="number"
              className={inputClass(!form.price_amount)}
              value={form.price_amount}
              onChange={(e) => setForm({ ...form, price_amount: e.target.value })}
              placeholder="9500"
            />
          </div>
          <div className="col-span-3">
            {label("Monto en letras", true)}
            <input
              className={inputClass(!form.price_in_words)}
              value={form.price_in_words}
              onChange={(e) => setForm({ ...form, price_in_words: e.target.value })}
              placeholder="nueve mil quinientos"
            />
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
        {loading ? "Generando..." : "Generar carta de deslinde"}
      </button>
    </form>
  );
}
