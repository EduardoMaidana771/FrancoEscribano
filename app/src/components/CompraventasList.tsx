"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, Download, Search, Pencil, Trash2 } from "lucide-react";

interface TransactionRow {
  id: string;
  status: string;
  transaction_date: string;
  folder_name: string | null;
  price_amount: number | null;
  price_currency: string;
  created_at: string;
  seller_id: string | null;
  seller2_id: string | null;
  buyer_id: string | null;
  buyer2_id: string | null;
  vehicle_id: string | null;
  seller: { full_name: string } | null;
  buyer: { full_name: string } | null;
  vehicle: { brand: string; model: string; plate: string } | null;
}

export default function CompraventasList({
  transactions,
}: {
  transactions: TransactionRow[];
}) {
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const filtered = transactions.filter((tx) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      tx.seller?.full_name?.toLowerCase().includes(q) ||
      tx.buyer?.full_name?.toLowerCase().includes(q) ||
      tx.vehicle?.plate?.toLowerCase().includes(q) ||
      tx.vehicle?.brand?.toLowerCase().includes(q) ||
      tx.vehicle?.model?.toLowerCase().includes(q) ||
      tx.folder_name?.toLowerCase().includes(q)
    );
  });

  async function downloadWord(txId: string) {
    setDownloading(txId);
    try {
      const res = await fetch("/api/generate-word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: txId }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Error al generar documento");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") ||
        "compraventa.docx";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const tx = transactions.find((t) => t.id === deleteId);
      // Delete transaction first (has FKs to clients/vehicle)
      const { error: txErr } = await supabase
        .from("transactions")
        .delete()
        .eq("id", deleteId);
      if (txErr) throw txErr;

      // Delete associated records
      if (tx) {
        const clientIds = [
          (tx as unknown as Record<string, unknown>).seller_id,
          (tx as unknown as Record<string, unknown>).seller2_id,
          (tx as unknown as Record<string, unknown>).buyer_id,
          (tx as unknown as Record<string, unknown>).buyer2_id,
        ].filter(Boolean) as string[];

        if (clientIds.length > 0) {
          await supabase.from("clients").delete().in("id", clientIds);
        }

        const vehicleId = (tx as unknown as Record<string, unknown>).vehicle_id as string | null;
        if (vehicleId) {
          await supabase.from("vehicles").delete().eq("id", vehicleId);
        }
      }

      setDeleteId(null);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Compraventas</h1>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, matrícula..."
            className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-20">
          <FileText size={48} className="mx-auto mb-3" />
          <p className="text-lg">No hay compraventas todavía</p>
          <p className="text-sm mt-1">
            Creá una nueva desde el menú lateral
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Vendedor</th>
                <th className="px-4 py-3">Comprador</th>
                <th className="px-4 py-3">Vehículo</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(tx.transaction_date).toLocaleDateString(
                      "es-UY"
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {tx.seller?.full_name || "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {tx.buyer?.full_name || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {tx.vehicle
                      ? `${tx.vehicle.brand} ${tx.vehicle.model} (${tx.vehicle.plate})`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {tx.price_amount
                      ? `${tx.price_currency === "USD" ? "USD" : "$"} ${tx.price_amount.toLocaleString()}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        tx.status === "completado"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {tx.status === "completado"
                        ? "Completado"
                        : "Borrador"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <Link
                        href={`/compraventa/${tx.id}/editar`}
                        className="flex items-center gap-1 text-gray-600 hover:text-blue-600 text-xs"
                      >
                        <Pencil size={14} />
                        Editar
                      </Link>
                      <button
                        onClick={() => downloadWord(tx.id)}
                        disabled={downloading === tx.id}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs disabled:opacity-50"
                      >
                        <Download size={14} />
                        {downloading === tx.id ? "..." : "Word"}
                      </button>
                      <button
                        onClick={() => setDeleteId(tx.id)}
                        className="flex items-center gap-1 text-red-500 hover:text-red-700 text-xs"
                      >
                        <Trash2 size={14} />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Confirmar eliminación
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Estás seguro de que querés eliminar esta compraventa? Se borrarán
              también los datos del vendedor, comprador y vehículo asociados.
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
