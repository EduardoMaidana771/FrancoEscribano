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
  nupcias_type?: string;
  spouse_name?: string;
  address?: string;
  department?: string;
}

interface VehicleData {
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
}

interface CompromisoRequest {
  ciudad: string;
  fecha: string; // YYYY-MM-DD
  padron?: string;
  padron_department?: string;
  sellers: PersonData[]; // 1 or 2
  buyer: PersonData;
  vehicle: VehicleData;
  price: {
    amount_words: string;    // "ocho mil quinientos"
    amount_number: string;   // "U$S 8.500,oo"
    currency_symbol?: string; // "U$S" or "$"
    payment_method?: string; // "en efectivo, en este acto"
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
  return `${day} de ${month} del año ${year}`;
}

// ─── TEXT BUILDERS ───────────────────────────────────────────

function buildPersonDesc(p: PersonData): string {
  let text = "";

  if (p.civil_status === "casado" && p.nupcias_type && p.spouse_name) {
    // couple: "Los cónyuges entre sí en únicas nupcias X e Y..."
    text = `${p.full_name}`;
  } else {
    text = `${p.full_name}`;
  }

  if (p.nationality) text += `, ${p.nationality}`;
  text += `, mayor de edad`;

  if (p.civil_status === "casado" && p.nupcias_type && p.spouse_name) {
    text += `, casado/a en ${p.nupcias_type} nupcias con ${p.spouse_name}`;
  } else if (p.civil_status === "divorciado" && p.nupcias_type && p.spouse_name) {
    text += `, divorciado/a de sus ${p.nupcias_type} nupcias con ${p.spouse_name}`;
  } else if (p.civil_status) {
    text += `, ${p.civil_status}`;
  }

  text += `, titular de la cédula de identidad número ${p.ci_number}`;
  if (p.address) text += `, domiciliado/a en ${p.address}`;
  if (p.department) text += `, departamento de ${p.department}`;
  return text;
}

function buildSellersDesc(sellers: PersonData[]): string {
  if (sellers.length === 1) {
    return buildPersonDesc(sellers[0]);
  }
  // couple: "Los cónyuges entre sí en X nupcias A y B, ambos orientales..."
  const s1 = sellers[0];
  const s2 = sellers[1];
  const nupcias = s1.nupcias_type || s1.civil_status === "casado" ? `en ${s1.nupcias_type || "únicas"} nupcias` : "";
  let text = `Los cónyuges entre sí ${nupcias} ${s1.full_name} y ${s2.full_name}`;
  const nationality = s1.nationality || "orientales";
  text += `, ambos ${nationality}, mayores de edad`;
  text += `, titulares de la cédula de identidad número ${s1.ci_number} y ${s2.ci_number}, respectivamente`;
  if (s1.address) text += `, domiciliados en ${s1.address}`;
  if (s1.department) text += `, departamento de ${s1.department}`;
  return text;
}

function buildVehicleDesc(v: VehicleData): string {
  let parts: string[] = [];
  if (v.type) parts.push(`Tipo ${v.type.toUpperCase()}`);
  if (v.brand) parts.push(`Marca ${v.brand.toUpperCase()}`);
  if (v.model) parts.push(`Modelo ${v.model.toUpperCase()}`);
  if (v.year) parts.push(`Año ${v.year}`);
  if (v.padron) {
    const dept = v.padron_department ? ` de ${v.padron_department}` : "";
    parts.push(`Padrón actual${dept} número ${v.padron}`);
  }
  if (v.plate) {
    const dept = v.plate_department ? ` del departamento de ${v.plate_department}` : "";
    parts.push(`Matrícula número ${v.plate}${dept}`);
  }
  if (v.motor_number) parts.push(`Motor ${v.motor_number}`);
  if (v.fuel) parts.push(`combustible ${v.fuel}`);
  if (v.chassis_number) parts.push(`Chasis ${v.chassis_number}`);
  return parts.join(", ");
}

function buildBodyText(
  ciudad: string,
  fechaLetras: string,
  sellers: PersonData[],
  buyer: PersonData,
  vehicle: VehicleData,
  price: CompromisoRequest["price"]
): string {
  const sellersDesc = buildSellersDesc(sellers);
  const buyerDesc = buildPersonDesc(buyer);
  const vehicleDesc = buildVehicleDesc(vehicle);
  const paymentMethod = price.payment_method || "en efectivo, en este acto";
  const currencySymbol = price.currency_symbol || "U$S";

  return `En la ciudad de ${ciudad}, el día ${fechaLetras}, las partes que se expresan han convenido celebrar el siguiente contrato de compromiso de compraventa:\nPARTE PROMITENTE VENDEDORA.- ${sellersDesc}.-\n2. PARTE COMPRADORA.- ${buyerDesc}.-\n3. BIEN QUE SE VENDE.- La parte promitente vendedora promete vender a la parte promitente compradora y ésta a adquirir, libre de toda obligación y gravamen, multas y demás infracciones, el siguiente bien: AUTOMOTOR: ${vehicleDesc}.-\n4. PRECIO.- El precio de la compraventa queda fijado en la suma de dólares billetes estadounidenses ${price.amount_words} (${currencySymbol} ${price.amount_number}) que la parte promitente compradora abona ${paymentMethod} a la parte promitente vendedora.-\n5. El presente queda condicionado a: a- Que los títulos de propiedad y demás documentación sean buenos a juicio del Escribano actuante; y b- La condición de que el bien y enajenante se encuentren libres de inscripciones en los Registros Públicos que afecten el otorgamiento prometido.-\n6. Cláusula resolutoria.- Se conviene expresamente que este compromiso queda sujeto a la condición resolutoria de que dentro del plazo de 30 días contados a partir de hoy se obtengan, todos los títulos antecedentes originales o testimonios por exhibición.- En caso de incumplirse con esta cláusula el contrato se rescindirá sin responsabilidad para ninguna de las partes, restituyéndose cosa y precio dentro del plazo de 10 días corridos a contar del vencimiento del plazo mencionado.-\n7. Deudas. Obligaciones. Afectaciones Pendientes. Para el caso que de los certificados registrales resultaren inscripciones que afectaren al Vehículo o a la persona de los actuales o anteriores propietarios, o existieran deudas por multas o patente de rodados o cualquier otro concepto relativo al Vehículo, la parte promitente vendedora se obliga a cancelar las obligaciones generadoras de tales inscripciones o dichas deudas, dentro del plazo de cinco días contados a partir de la fecha en que por cualquier medio auténtico escrito, se le comunique tal situación. Vencido dicho plazo, sin que así se hubiere efectuado, la parte promitente compradora queda facultada a cancelar las obligaciones de referencia, debiendo la parte promitente vendedora restituir a la parte promitente compradora el importe correspondiente o rescindir el presente contrato, sin responsabilidad para las partes, bastando para ello la sola comunicación que por medio auténtico escrito le efectúe a la otra parte de tal voluntad, debiendo las partes proceder a las recíprocas restituciones.\n8. ENTREGA DE BIEN.- La parte promitente vendedora entrega a la parte promitente compradora la propiedad y posesión del bien relacionado, quien en tales conceptos lo recibe su entera satisfacción y conformidad en este acto.- Desde ese momento son de cuenta de la parte promitente compradora todas las responsabilidades civiles y/o penales que con el mismo se cometan u ocasionare a terceros.-\n9. Los impuestos, honorarios y demás gastos que origine este contrato serán de cargo de la parte promitente compradora.-\n10. DOMICILIO.- Las partes constituyen domicilios especiales a todos los efectos a que pueda dar lugar este contrato, los indicados respectivamente como suyos en la comparecencia.-\n11. DECLARACIONES.- Declara la parte promitente vendedora que el vehículo se encuentra en la siguiente situación:\nTitularidad del vehículo: promitente vendedora.-\nLibreta de circulación a nombre de: promitente vendedora.-\nQue el número de motor y chasis del vehículo prometido en venta, a la fecha es el mismo que figura en la libreta de circulación conociendo las responsabilidades que asume por esta declaración.-\nPatente y Seguro al día.\n12.- De conformidad las partes suscriben dos ejemplares del mismo escrito en el lugar y fecha indicados ut supra.-`;
}

function buildSellerFirmaBlocks(sellers: PersonData[]): string {
  return sellers
    .map((s) => `……………………………………\n${s.full_name}\n     (Promitente vendedora)`)
    .join("\n\n");
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

  let body: CompromisoRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const { ciudad, fecha, padron, padron_department, sellers, buyer, vehicle, price } = body;

  if (!ciudad || !fecha || !sellers?.length || !buyer?.full_name || !buyer?.ci_number || !vehicle?.brand || !price?.amount_words) {
    return NextResponse.json(
      { error: "Faltan campos requeridos: ciudad, fecha, sellers, buyer, vehicle, price" },
      { status: 400 }
    );
  }

  const templatePath = path.join(process.cwd(), "templates", "compromiso.docx");
  let templateContent: Buffer;
  try {
    templateContent = readFileSync(templatePath);
  } catch {
    return NextResponse.json(
      { error: "Plantilla compromiso.docx no encontrada en /templates/" },
      { status: 500 }
    );
  }

  const fechaLetras = formatDateLetras(fecha);
  const bodyText = buildBodyText(ciudad, fechaLetras, sellers, buyer, vehicle, price);
  const sellerFirmaBlocks = buildSellerFirmaBlocks(sellers);

  const zip = new PizZip(templateContent);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

  doc.render({
    padron: padron || "___",
    padron_department: (padron_department || "___").toUpperCase(),
    body_text: bodyText,
    seller_firma_blocks: sellerFirmaBlocks,
    buyer_firma_name: `……………………………………\n${buyer.full_name}`,
  });

  const buf = doc.getZip().generate({ type: "uint8array", compression: "DEFLATE" });
  const plate = vehicle.plate || padron || "vehiculo";
  const fileName = `compromiso_${plate}_${fecha}.docx`;

  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
