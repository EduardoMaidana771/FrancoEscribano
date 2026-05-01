import { existsSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const RUN_LIVE = process.env.RUN_LIVE_SUPABASE_FIXTURE_TESTS === "1";
const FOLDER_ID = "af39e8fe-ea2a-4732-af49-830152d4a21c";

function loadLocalEnv(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return {};

  const entries = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const [key, ...rest] = line.split("=");
      return [key, rest.join("=")] as const;
    });

  return Object.fromEntries(entries);
}

async function getJson(url: string, serviceRoleKey: string) {
  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed: ${response.status}`);
  }

  return response.json();
}

(RUN_LIVE ? describe : describe.skip)("prod folder availability fixture", () => {
  it("valida sólo datos realmente presentes en la carpeta real", async () => {
    const env = loadLocalEnv();
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

    expect(supabaseUrl).toBeTruthy();
    expect(serviceRoleKey).toBeTruthy();

    const files = await getJson(
      `${supabaseUrl}/rest/v1/files?folder_id=eq.${FOLDER_ID}&select=file_name,extracted_data`,
      serviceRoleKey
    );

    const byName = new Map(files.map((file: { file_name: string; extracted_data: Record<string, unknown> }) => [file.file_name, file.extracted_data]));

    const buyerTxt = byName.get("Comprador.txt") as Record<string, unknown>;
    const cartaPoder = byName.get("carta poder OAE7011.pdf") as Record<string, unknown>;
    const antecedente = byName.get("Antecedentes Fiat Strada OAE7011.pdf") as Record<string, unknown>;
    const cedula = byName.get("cedula.jpg") as Record<string, unknown>;

    expect(((buyerTxt.persons as Array<Record<string, unknown>>)[0]).full_name).toBe("Maria Fernanda Berrueta Maidana");
    expect(((buyerTxt.persons as Array<Record<string, unknown>>)[0]).address).toBe("Ñangapire esq Cambara");
    expect((buyerTxt.price as Record<string, unknown>).amount).toBe(12600);

    expect((antecedente.buyer as Record<string, unknown>).full_name).toBe("Marcelo Nicolás LAVALLEN ACUÑA");
    expect((antecedente.buyer as Record<string, unknown>).address).toBe("Ruta 12 y 9");

    expect((cartaPoder.power_date as string)).toBe("2025-11-13");
    expect((cartaPoder.notary as string)).toBe("Franco Castiglioni Abelenda");
    expect(((cartaPoder.poderdante as Record<string, unknown>).address as string)).toContain("San Carlos");
    expect((cartaPoder.apoderado as Record<string, unknown>).address ?? null).toBeNull();

    expect((cedula.nationality as string)).toBe("URUGUAYA");
  });
});