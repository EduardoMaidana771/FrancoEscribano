import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { readFileSync } from "fs";
import path from "path";

// ─── TYPES ───────────────────────────────────────────────────

interface PersonData {
  full_name: string;
  ci_number: string;
  nationality?: string;
  civil_status?: string;
  address?: string;
  department?: string;
  is_known?: boolean; // true = "de mi conocimiento", false = "que no conozco"
}

interface ApoderadoData {
  poderdante_name: string;
  poderdante_ci: string;
  poderdante_address?: string;
  power_type: string; // "carta poder" | "escritura pública de Poder General" | etc.
  power_date: string; // DD/MM/YYYY or YYYY-MM-DD
  power_notary: string;
  power_protocol_date?: string; // if different from certification date
}

interface CertificacionImmRequest {
  ciudad: string;
  fecha: string; // YYYY-MM-DD
  vehicle: {
    plate: string;
    padron: string;
    padron_department: string;
  };
  compareciente: PersonData;
  apoderado?: ApoderadoData;
}

// ─── FORMAT HELPERS ──────────────────────────────────────────

function formatDateLetras(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre",
  ];
  const dayWords: Record<number, string> = {
    1: "primero", 2: "dos", 3: "tres", 4: "cuatro", 5: "cinco",
    6: "seis", 7: "siete", 8: "ocho", 9: "nueve", 10: "diez",
    11: "once", 12: "doce", 13: "trece", 14: "catorce", 15: "quince",
    16: "dieciséis", 17: "diecisiete", 18: "dieciocho", 19: "diecinueve",
    20: "veinte", 21: "veintiuno", 22: "veintidós", 23: "veintitrés",
    24: "veinticuatro", 25: "veinticinco", 26: "veintiséis", 27: "veintisiete",
    28: "veintiocho", 29: "veintinueve", 30: "treinta", 31: "treinta y uno",
  };
  const yearWords: Record<number, string> = {
    2024: "dos mil veinticuatro", 2025: "dos mil veinticinco",
    2026: "dos mil veintiséis", 2027: "dos mil veintisiete",
    2028: "dos mil veintiocho", 2029: "dos mil veintinueve",
    2030: "dos mil treinta",
  };
  const day = dayWords[d.getDate()] || String(d.getDate());
  const month = months[d.getMonth()];
  const year = yearWords[d.getFullYear()] || String(d.getFullYear());
  return `${day} de ${month} de ${year}`;
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return "___";
  // Accept YYYY-MM-DD or DD/MM/YYYY
  if (dateStr.includes("-") && dateStr.length === 10) {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  }
  return dateStr;
}

// ─── TEXT BUILDERS ───────────────────────────────────────────

function buildSectionI(
  v: CertificacionImmRequest["vehicle"],
  c: PersonData
): string {
  const knowText = c.is_known
    ? "de mi conocimiento"
    : "que no conozco, pero acredito su identidad con el documento respectivo";

  const title = c.civil_status === "casado" || c.civil_status === "divorciado" || c.civil_status === "viudo"
    ? "señora"
    : "señor/señora";

  const civilDesc = c.civil_status
    ? `, mayor de edad, ${c.civil_status}`
    : ", mayor de edad";

  let text = `La firma que antecede referente al vehículo matrícula ${v.plate}, empadronado con el N° ${v.padron} en la Intendencia Departamental de ${v.padron_department.toUpperCase()}, es auténtica, fue puesta en mi presencia y pertenece a persona hábil, ${knowText} ${title} ${c.full_name}`;
  text += `, ${c.nationality || "oriental"}${civilDesc}`;
  text += `, titular de la cédula de identidad número ${c.ci_number}`;
  if (c.address) text += `, domiciliado/a a estos efectos en ${c.address}`;
  if (c.department) text += `, departamento de ${c.department}`;
  return text;
}

function buildSectionII(c: PersonData, a: ApoderadoData): string {
  const title = "señor/señora";
  let text = ` II) El/La ${title} ${c.full_name} lo/la hace en representación de ${a.poderdante_name}, titular de la cédula de identidad número ${a.poderdante_ci}`;
  if (a.poderdante_address) text += ` y domiciliado/a en ${a.poderdante_address}`;
  text += `, según ${a.power_type || "carta poder"} de fecha ${formatDateShort(a.power_date)}`;
  if (a.power_protocol_date && a.power_protocol_date !== a.power_date) {
    text += `, cuya firma fue certificada el ${formatDateShort(a.power_date)} y protocolizada el ${formatDateShort(a.power_protocol_date)}`;
  } else {
    text += `, cuya firma fue certificada y protocolizada`;
  }
  text += ` por el/la Escribano/a ${a.power_notary} en igual fecha, con facultades suficientes para este acto y vigente a la fecha.`;
  return text;
}

// ─── MAIN HANDLER ────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: CertificacionImmRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const { ciudad, fecha, vehicle, compareciente, apoderado } = body;

  if (!ciudad || !fecha || !vehicle?.plate || !vehicle?.padron || !compareciente?.full_name || !compareciente?.ci_number) {
    return NextResponse.json(
      { error: "Faltan campos requeridos: ciudad, fecha, vehicle (plate, padron, padron_department), compareciente (full_name, ci_number)" },
      { status: 400 }
    );
  }

  const templatePath = path.join(process.cwd(), "templates", "certificacion-imm.docx");

  let templateContent: Buffer;
  try {
    templateContent = readFileSync(templatePath);
  } catch {
    return NextResponse.json(
      { error: "Plantilla certificacion-imm.docx no encontrada en /templates/" },
      { status: 500 }
    );
  }

  const zip = new PizZip(templateContent);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

  doc.render({
    section_i: buildSectionI(vehicle, compareciente),
    section_ii: apoderado ? buildSectionII(compareciente, apoderado) : "",
    quien_text: "quien",
    otorgo_text: "otorgo",
    ciudad,
    fecha_letras: formatDateLetras(fecha),
  });

  const buf = doc.getZip().generate({
    type: "uint8array",
    compression: "DEFLATE",
  });

  const fileName = `certificacion_imm_${vehicle.plate}_${fecha}.docx`;

  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
