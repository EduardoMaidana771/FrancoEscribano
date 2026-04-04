"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { Save, Check } from "lucide-react";
import DgrSessionPanel from "@/components/DgrSessionPanel";

interface ConfigFormProps {
  profile: Profile | null;
}

export default function ConfigForm({ profile }: ConfigFormProps) {
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    notary_name: profile?.notary_name ?? "",
    notary_initials: profile?.notary_initials ?? "",
    city: profile?.city ?? "",
    next_matriz_number: profile?.next_matriz_number ?? 133,
    next_folio_number: profile?.next_folio_number ?? 1,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  async function save() {
    setSaving(true);
    setSaved(false);

    await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        notary_name: form.notary_name,
        notary_initials: form.notary_initials,
        city: form.city,
        next_matriz_number: form.next_matriz_number,
        next_folio_number: form.next_folio_number,
      })
      .eq("id", profile?.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Configuración</h1>

      <div className="bg-white rounded-lg border p-6 space-y-6">
        <div>
          <h2 className="font-semibold text-gray-800 mb-3">
            Datos del escribano
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nombre completo
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, full_name: e.target.value }))
                }
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nombre para documentos (Esc. ...)
              </label>
              <input
                type="text"
                value={form.notary_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notary_name: e.target.value }))
                }
                placeholder="Ej: Franco Escribano"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Iniciales
              </label>
              <input
                type="text"
                value={form.notary_initials}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notary_initials: e.target.value }))
                }
                placeholder="Ej: F.E."
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Ciudad
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) =>
                  setForm((f) => ({ ...f, city: e.target.value }))
                }
                placeholder="Ej: Montevideo"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="font-semibold text-gray-800 mb-3">
            Numeración de protocolo
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Próximo número de matriz
              </label>
              <input
                type="number"
                value={form.next_matriz_number}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    next_matriz_number: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Próximo número de folio
              </label>
              <input
                type="number"
                value={form.next_folio_number}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    next_folio_number: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Estos números se incrementan automáticamente al completar una
            compraventa.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saved ? <Check size={16} /> : <Save size={16} />}
            {saving ? "Guardando..." : saved ? "Guardado" : "Guardar"}
          </button>
        </div>
      </div>

      {/* DGR Session */}
      <div className="mt-6">
        <DgrSessionPanel />
      </div>
    </div>
  );
}
