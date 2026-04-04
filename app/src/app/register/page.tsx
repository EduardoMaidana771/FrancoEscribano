import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            AutomatizaciónEscribano
          </h1>
          <p className="text-gray-500 mt-1">Registro temporalmente deshabilitado</p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            Por el momento no se permiten nuevos registros. Si necesitás acceso,
            contactá al administrador.
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          ¿Ya tenés cuenta?{" "}
          <Link
            href="/login"
            className="text-blue-600 font-medium hover:underline"
          >
            Ingresá
          </Link>
        </p>
      </div>
    </div>
  );
}
