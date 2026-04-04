"use client";

import { useState } from "react";
import { FileText, Download, Search } from "lucide-react";

interface TransactionRow {
  id: string;
  status: string;
  transaction_date: string;
  folder_name: string | null;
  price_amount: number | null;
  price_currency: string;
  created_at: string;
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
                <th className="px-4 py-3"></th>
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
                    <button
                      onClick={() => downloadWord(tx.id)}
                      disabled={downloading === tx.id}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs disabled:opacity-50"
                    >
                      <Download size={14} />
                      {downloading === tx.id ? "Generando..." : "Word"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
