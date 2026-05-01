import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { readFileSync } from "fs";
import path from "path";

// ─── TYPES ───────────────────────────────────────────────────

interface SellerData {
  full_name: string;
  ci_number: string;
  nationality?: string;
  civil_status?: string;
  nupcias_type?: string;
  spouse_name?: string;
  address?: string;
  department?: string;
}

interface CartaDeslindeRequest {
  ciudad: string;
  fecha: string; // YYYY-MM-DD
  hora?: string;
  sellers: SellerData[]; // 1 or 2 sellers
  buyer: {
    full_name: string;
    ci_number: string;
    nationality?: string;
    civil_status?: string;
    nupcias_type?: string;
    spouse_name?: string;
    address?: string;
    department?: string;
  };
  vehicle: {
    type?: string;
    brand: string;
    model: string;
    year?: number;
    padron?: string;
    padron_department?: string;
    plate?: string;
    plate_department?: string;
    motor_number?: string;
    fuel?: string;
    chassis_number?: string;
  };
  price: {
    amount: number;
    currency: "USD" | "UYU";
    in_words: string;
  };
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

function formatCivilStatus(s: SellerData | CartaDeslindeRequest["buyer"]): string {
  const map: Record<string, string> = {
    soltero: "soltero/a",
    casado: "casado/a",
    divorciado: "divorciado/a",
    viudo: "viudo/a",
    separado_bienes: "casado/a con separación judicial de bienes",
  };
  let text = map[s.civil_status ?? ""] ?? (s.civil_status || "mayor de edad");
  if ((s.civil_status === "casado" || s.civil_status === "separado_bienes") && s.nupcias_type) {
    text += ` en ${s.nupcias_type} nupcias`;
    if (s.spouse_name) text += ` con ${s.spouse_name}`;
  }
  return text;
}

// ─── TEXT BUILDERS ───────────────────────────────────────────

function buildVehicleDesc(v: CartaDeslindeRequest["vehicle"]): string {
  const parts: string[] = [];
  if (v.type) parts.push(`Tipo ${v.type.toUpperCase()}`);
  parts.push(`Marca ${v.brand.toUpperCase()}`);
  parts.push(`Modelo ${v.model.toUpperCase()}`);
  if (v.year) parts.push(`Año ${v.year}`);
  if (v.padron && v.padron_department)
    parts.push(`Padrón actual de ${v.padron_department.toUpperCase()} número ${v.padron}`);
  if (v.plate && v.plate_department)
    parts.push(`Matrícula número ${v.plate} del departamento de ${v.plate_department.toUpperCase()}`);
  if (v.motor_number) parts.push(`Motor ${v.motor_number}`);
  if (v.fuel) parts.push(`combustible ${v.fuel}`);
  if (v.chassis_number) parts.push(`Chasis ${v.chassis_number}`);
  return parts.join(", ");
}

function buildBuyerDesc(b: CartaDeslindeRequest["buyer"]): string {
  const title = b.civil_status === "casado" ? "los señores" : "el Señor/la Señora";
  let text = `${title} ${b.full_name}`;
  text += `, ${b.nationality || "oriental"}, mayor de edad`;
  text += `, ${formatCivilStatus(b)}`;
  text += `, titular de la cédula de identidad número ${b.ci_number}`;
  if (b.address) text += `, domiciliado/a en la calle ${b.address}`;
  if (b.department) text += `, departamento de ${b.department}`;
  return text;
}

function buildPriceDesc(p: CartaDeslindeRequest["price"]): string {
  const currencyWords = p.currency === "USD"
    ? "dólares billetes estadounidenses"
    : "pesos uruguayos";
  const symbol = p.currency === "USD" ? "U$S" : "$";
  return `${currencyWords} ${p.in_words} (${symbol} ${p.amount.toLocaleString("es-UY")})`;
}

function buildSellerDesc(sellers: SellerData[]): string {
  if (sellers.length === 1) {
    const s = sellers[0];
    let text = `${s.full_name}`;
    text += `, ${s.nationality || "oriental"}, mayor de edad`;
    text += `, ${formatCivilStatus(s)}`;
    text += `, titular de la cédula de identidad número ${s.ci_number}`;
    if (s.address) text += `, domiciliado/a en ${s.address}`;
    if (s.department) text += `, departamento de ${s.department}`;
    return text;
  }
  // Couple
  const [s1, s2] = sellers;
  let text = `${s1.full_name} y ${s2.full_name}`;
  text += `, ${s1.nationality || "orientales"}, mayores de edad`;
  text += `, ${formatCivilStatus(s1)}`;
  text += `, titulares de las cédulas de identidad números ${s1.ci_number} y ${s2.ci_number} respectivamente`;
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

  let body: CartaDeslindeRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const { ciudad, fecha, hora, sellers, buyer, vehicle, price } = body;

  if (!ciudad || !fecha || !sellers?.length || !buyer || !vehicle || !price) {
    return NextResponse.json(
      { error: "Faltan campos requeridos: ciudad, fecha, sellers, buyer, vehicle, price" },
      { status: 400 }
    );
  }

  const templatePath = path.join(process.cwd(), "templates", "carta-deslinde.docx");

  let templateContent: Buffer;
  try {
    templateContent = readFileSync(templatePath);
  } catch {
    return NextResponse.json(
      { error: "Plantilla carta-deslinde.docx no encontrada en /templates/" },
      { status: 500 }
    );
  }

  const zip = new PizZip(templateContent);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

  const sellerFirmaName = sellers.map((s) => s.full_name).join(" y ");
  const sellerCi = sellers.length === 1
    ? sellers[0].ci_number
    : sellers.map((s) => s.ci_number).join(" y ");

  doc.render({
    ciudad,
    fecha_letras: formatDateLetras(fecha),
    vehicle_desc: buildVehicleDesc(vehicle),
    buyer_desc: buildBuyerDesc(buyer),
    price_desc: buildPriceDesc(price),
    hora: hora || "____",
    seller_desc: buildSellerDesc(sellers),
    buyer_firma_name: buyer.full_name,
    buyer_ci: buyer.ci_number,
    seller_firma_name: sellerFirmaName,
    seller_ci: sellerCi,
  });

  const buf = doc.getZip().generate({
    type: "uint8array",
    compression: "DEFLATE",
  });

  const plate = vehicle.plate ?? "sin_matricula";
  const fileName = `carta_deslinde_${plate}_${fecha}.docx`;

  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
