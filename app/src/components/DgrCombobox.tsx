"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";

export interface DgrOption {
  Id: string;
  Value: string;
}

interface DgrComboboxProps {
  label: string;
  value: string;
  dgrId: string;
  onChange: (value: string, dgrId: string) => void;
  catalogName: string;
  /** Query prefix for cascading (e.g. brand ID for models) */
  prefix?: string;
  /** Disable fetching (e.g. models before brand is selected) */
  disabled?: boolean;
  placeholder?: string;
  /** External validation error message */
  validationError?: string;
  /** data-field attribute for scroll-to-error */
  fieldKey?: string;
}

export default function DgrCombobox({
  label,
  value,
  dgrId,
  onChange,
  catalogName,
  prefix = "",
  disabled = false,
  placeholder = "",
  validationError,
  fieldKey,
}: DgrComboboxProps) {
  const [options, setOptions] = useState<DgrOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchOptions = useCallback(async () => {
    if (disabled) return;
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ name: catalogName });
      if (prefix) params.set("prefix", prefix);
      const res = await fetch(`/api/dgr/catalogs?${params}`);
      if (!res.ok) {
        setError(true);
        setManualMode(true);
        return;
      }
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        setOptions(json.data);
        setManualMode(false);
      } else {
        setError(true);
        setManualMode(true);
      }
    } catch {
      setError(true);
      setManualMode(true);
    } finally {
      setLoading(false);
    }
  }, [catalogName, prefix, disabled]);

  // Fetch on mount and when prefix changes
  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter((o) =>
    o.Value.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (opt: DgrOption) => {
    onChange(opt.Value, opt.Id);
    setSearch("");
    setOpen(false);
  };

  const handleManualChange = (v: string) => {
    onChange(v, "");
    setSearch(v);
  };

  // Manual text input mode (DGR unavailable or user toggled)
  if (manualMode) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {label}
        </label>
        <div className="flex gap-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value, "")}
            placeholder={placeholder || `Escribir ${label.toLowerCase()}...`}
            data-field={fieldKey}
            className={`flex-1 border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${validationError ? "border-red-500 bg-red-50" : "border-gray-300"}`}
          />
          {error && !loading && (
            <button
              type="button"
              onClick={() => {
                setManualMode(false);
                fetchOptions();
              }}
              className="px-2 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-100 whitespace-nowrap"
              title="Reintentar carga desde DGR"
            >
              ↻
            </button>
          )}
        </div>
        {error && (
          <p className="text-xs text-amber-600 mt-0.5">
            DGR no disponible — ingreso manual
          </p>
        )}
        {validationError && (
          <p className="text-red-600 text-xs mt-1">{validationError}</p>
        )}
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={open ? search : value}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setSearch("");
          }}
          placeholder={
            loading
              ? "Cargando..."
              : disabled
                ? "Seleccioná primero..."
                : placeholder || `Buscar ${label.toLowerCase()}...`
          }
          disabled={disabled || loading}
          data-field={fieldKey}
          className={`w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400 ${validationError ? "border-red-500 bg-red-50" : "border-gray-300"}`}
        />
        {loading && (
          <Loader2
            size={14}
            className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-gray-400"
          />
        )}
      </div>

      {open && !loading && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map((opt) => (
              <button
                key={opt.Id}
                type="button"
                onClick={() => handleSelect(opt)}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 transition-colors ${
                  dgrId === opt.Id ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
                }`}
              >
                {opt.Value}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              {search ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange(search, "");
                    setOpen(false);
                    setSearch("");
                  }}
                  className="text-blue-600 hover:underline"
                >
                  Usar &quot;{search}&quot; como texto libre
                </button>
              ) : (
                "Sin resultados"
              )}
            </div>
          )}
          <div className="border-t px-3 py-1.5">
            <button
              type="button"
              onClick={() => {
                setManualMode(true);
                setOpen(false);
              }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Cambiar a ingreso manual
            </button>
          </div>
        </div>
      )}
      {validationError && (
        <p className="text-red-600 text-xs mt-1">{validationError}</p>
      )}
    </div>
  );
}
