"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Shield, ShieldCheck, ShieldX, RefreshCw, ExternalLink } from "lucide-react";

type DgrStatus = "loading" | "active" | "expired" | "no_session";

export default function DgrSessionPanel() {
  const [status, setStatus] = useState<DgrStatus>("loading");
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualCookies, setManualCookies] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [bookmarkletCode, setBookmarkletCode] = useState("");

  const supabase = createClient();

  const checkSession = useCallback(async () => {
    setChecking(true);
    setMessage(null);
    try {
      const resp = await fetch("/api/dgr/session");
      const data = await resp.json();
      setStatus(data.valid ? "active" : data.status === "no_session" ? "no_session" : "expired");
      setLastChecked(new Date().toLocaleTimeString("es-UY"));
    } catch {
      setStatus("expired");
    } finally {
      setChecking(false);
    }
  }, []);

  // Generate bookmarklet code with current user's token
  useEffect(() => {
    async function generateBookmarklet() {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;

      // The app URL — in prod this would be the real domain
      const appUrl = window.location.origin;

      const code = `javascript:void(fetch('${appUrl}/api/dgr/capture',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer ${token}'},body:JSON.stringify({cookies:document.cookie})}).then(r=>r.json()).then(d=>alert(d.ok?'Sesión DGR guardada!':'Error: '+d.error)).catch(e=>alert('Error: '+e.message)))`;
      setBookmarkletCode(code);
    }
    generateBookmarklet();
  }, [supabase.auth]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  async function handleManualSave() {
    if (!manualCookies.trim()) return;
    setSaving(true);
    setMessage(null);

    try {
      const resp = await fetch("/api/dgr/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookie_string: manualCookies.trim() }),
      });
      const data = await resp.json();

      if (resp.ok) {
        setMessage({ type: "ok", text: "Sesión DGR guardada correctamente" });
        setStatus("active");
        setManualCookies("");
        setShowManual(false);
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "Error de conexión" });
    } finally {
      setSaving(false);
    }
  }

  const statusConfig = {
    loading: { icon: RefreshCw, color: "text-gray-400", bg: "bg-gray-50", label: "Verificando..." },
    active: { icon: ShieldCheck, color: "text-green-600", bg: "bg-green-50", label: "Sesión activa" },
    expired: { icon: ShieldX, color: "text-red-600", bg: "bg-red-50", label: "Sesión expirada" },
    no_session: { icon: Shield, color: "text-yellow-600", bg: "bg-yellow-50", label: "Sin sesión" },
  };

  const cfg = statusConfig[status];
  const Icon = cfg.icon;

  return (
    <div className={`rounded-lg border p-4 ${cfg.bg}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={20} className={cfg.color} />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">DGR — Dirección General de Registros</h3>
            <p className={`text-xs ${cfg.color}`}>{cfg.label}</p>
          </div>
        </div>
        <button
          onClick={checkSession}
          disabled={checking}
          className="p-1.5 text-gray-500 hover:text-gray-700 rounded hover:bg-white/50 transition-colors"
          title="Verificar sesión"
        >
          <RefreshCw size={16} className={checking ? "animate-spin" : ""} />
        </button>
      </div>

      {lastChecked && (
        <p className="text-[11px] text-gray-500 mb-3">Última verificación: {lastChecked}</p>
      )}

      {/* Message */}
      {message && (
        <div
          className={`text-xs px-3 py-2 rounded mb-3 ${
            message.type === "ok" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Actions when expired or no session */}
      {(status === "expired" || status === "no_session") && (
        <div className="space-y-2">
          <p className="text-xs text-gray-600">
            Necesitás iniciar sesión en DGR con tu usuario gub.uy para enviar minutas.
          </p>

          {/* Option 1: Open DGR + bookmarklet */}
          <div className="space-y-1.5">
            <a
              href="https://digital.dgr.gub.uy/DGR_FRONTEND/servlet/com.tramitesenlinea.bandejaciudadano"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
            >
              <ExternalLink size={14} />
              Abrir DGR (gub.uy ID)
            </a>

            {bookmarkletCode && (
              <div className="text-[11px] text-gray-500 bg-white/80 rounded p-2">
                <p className="font-medium mb-1">Después de iniciar sesión:</p>
                <p className="mb-1.5">
                  Arrastrá este botón a tu barra de favoritos, luego hacé clic en él estando en la página de DGR:
                </p>
                <a
                  href={bookmarkletCode}
                  className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded border border-blue-200 font-mono text-[10px] cursor-grab"
                  onClick={(e) => {
                    e.preventDefault();
                    alert(
                      "Arrastrá este enlace a tu barra de favoritos.\n\nDespués, entrá a DGR y hacé clic en él."
                    );
                  }}
                >
                  📋 Guardar sesión DGR
                </a>
              </div>
            )}
          </div>

          {/* Option 2: Manual paste */}
          <button
            onClick={() => setShowManual(!showManual)}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            {showManual ? "Ocultar" : "O pegar cookies manualmente"}
          </button>

          {showManual && (
            <div className="space-y-2">
              <textarea
                value={manualCookies}
                onChange={(e) => setManualCookies(e.target.value)}
                placeholder="GX_CLIENT_ID=...; JSESSIONID=...; GX_SESSION_ID=...; ROUTEID=...; GxTZOffset=..."
                className="w-full h-20 text-xs font-mono border rounded p-2 bg-white"
              />
              <button
                onClick={handleManualSave}
                disabled={saving || !manualCookies.trim()}
                className="w-full px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {saving ? "Verificando..." : "Guardar cookies"}
              </button>
              <div className="text-[11px] text-gray-500 bg-white/80 rounded p-2">
                <p className="font-medium">Cómo obtener las cookies:</p>
                <ol className="list-decimal ml-3 space-y-0.5">
                  <li>Abrí DGR e iniciá sesión</li>
                  <li>Presioná F12 → pestaña &quot;Application&quot;</li>
                  <li>En &quot;Cookies&quot; → digital.dgr.gub.uy</li>
                  <li>Copiá: GX_CLIENT_ID, JSESSIONID, GX_SESSION_ID, ROUTEID</li>
                  <li>Formato: <code className="bg-gray-100 px-1">nombre=valor; nombre2=valor2</code></li>
                </ol>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active state */}
      {status === "active" && (
        <p className="text-xs text-green-700">
          Podés enviar minutas a DGR. La sesión se verifica automáticamente.
        </p>
      )}
    </div>
  );
}
