import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { readFileSync } from "fs";
import path from "path";

// ─── TYPES ───────────────────────────────────────────────────

interface AcreodorData {
  type: "company" | "person";
  // company
  company_name?: string;
  company_rut?: string;
  company_address?: string;
  company_rep_name?: string;
  company_rep_ci?: string;
  company_rep_nationality?: string;
  company_rep_role?: string; // "socio administrador", "director", etc.
  // person
  full_name?: string;
  ci_number?: string;
  nationality?: string;
  civil_status?: string;
  address?: string;
  department?: string;
}

interface DeudorData {
  full_name: string;
  ci_number: string;
  nationality?: string;
  civil_status?: string;
  nupcias_type?: string;
  spouse_name?: string;
  civil_arrangement?: string; // "separado de bienes por capitulaciones matrimoniales"
  address?: string;
  department?: string;
}

interface LoanData {
  total_amount_words: string;   // "once mil cuatrocientos doce"
  total_amount_number: string;  // "U$S 11.412,oo"
  cuotas_count_words: string;   // "treinta y seis (36)"
  cuota_amount_words: string;   // "trescientos diecisiete"
  cuota_amount_number: string;  // "U$S 317,oo"
  first_due_text: string;       // "14 de enero de 2025"
  day_of_month_text: string;    // "catorce"
  bank_payment_info?: string;   // "Las referidas cuotas deben abonarse mediante acreditación en..."
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

interface PrendaRequest {
  ciudad: string;
  fecha: string; // YYYY-MM-DD
  acreedor: AcreodorData;
  deudor: DeudorData;
  loan: LoanData;
  vehicle: VehicleData;
  notary_name: string;
  notary_gender?: "f" | "m";
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

// ─── TEXT BUILDERS ───────────────────────────────────────────

function buildAcreodorDesc(a: AcreodorData): string {
  if (a.type === "company") {
    let text = `${a.company_name}`;
    if (a.company_rut) text += `, persona jurídica inscripta en el Registro Único Tributario de la Dirección General Impositiva con el número ${a.company_rut}`;
    if (a.company_address) text += `, con domicilio en ${a.company_address}`;
    if (a.company_rep_name) {
      const nat = a.company_rep_nationality || "oriental";
      text += `, representada en este acto por el Señor ${a.company_rep_name}, ${nat}, mayor de edad`;
      if (a.company_rep_ci) text += `, titular de la cédula de identidad uruguaya número ${a.company_rep_ci}`;
      if (a.company_rep_role) text += `, quien actúa en su calidad de ${a.company_rep_role}`;
    }
    return text;
  }
  // person
  let text = `${a.full_name || ""}`;
  if (a.nationality) text += `, ${a.nationality}`;
  text += `, mayor de edad`;
  if (a.civil_status) text += `, ${a.civil_status}`;
  if (a.ci_number) text += `, titular de la cédula de identidad uruguaya número ${a.ci_number}`;
  if (a.address) text += `, domiciliado/a en ${a.address}`;
  if (a.department) text += `, departamento de ${a.department}`;
  return text;
}

function buildDeudorDesc(d: DeudorData): string {
  let text = `${d.full_name}`;
  if (d.nationality) text += `, ${d.nationality}`;
  text += `, mayor de edad`;
  if (d.civil_status === "casado" && d.nupcias_type && d.spouse_name) {
    text += `, casado/a en ${d.nupcias_type} nupcias`;
    if (d.civil_arrangement) {
      text += ` y ${d.civil_arrangement} con ${d.spouse_name}`;
    } else {
      text += ` con ${d.spouse_name}`;
    }
  } else if (d.civil_status) {
    text += `, ${d.civil_status}`;
  }
  if (d.ci_number) text += `, titular de la cédula de identidad uruguaya número ${d.ci_number}`;
  if (d.address) text += `, domiciliado/a en ${d.address}`;
  if (d.department) text += `, departamento de ${d.department}`;
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

function buildAcreodorNombre(a: AcreodorData): string {
  return a.type === "company" ? (a.company_name || "") : (a.full_name || "");
}

function buildFullText(
  ciudad: string,
  fechaLetras: string,
  acreedor: AcreodorData,
  deudor: DeudorData,
  loan: LoanData,
  vehicle: VehicleData,
  notaryName: string,
  notaryGender: "f" | "m"
): string {
  const acreodorDesc = buildAcreodorDesc(acreedor);
  const deudorDesc = buildDeudorDesc(deudor);
  const vehicleDesc = buildVehicleDesc(vehicle);
  const acreodorNombre = buildAcreodorNombre(acreedor);
  const notaryTitle = notaryGender === "f" ? "la Escribana" : "el Escribano";

  let text = `PRENDA DE VEHÍCULO AUTOMOTOR.- En la ciudad de ${ciudad}, el día ${fechaLetras}, comparecen: POR UNA PARTE: ${acreodorDesc}; en adelante denominada "Parte Acreedora".- Y POR OTRA PARTE: ${deudorDesc}; en adelante denominada "Parte Deudora".- Quienes convienen en celebrar el presente contrato de prenda de vehículo automotor sin desplazamiento de la tenencia, el que se regirá por las siguientes cláusulas: PRIMERO.- La parte nombrada en segundo término ha contraído una deuda con ${acreodorNombre} por la suma de dólares billetes estadounidenses ${loan.total_amount_words} (${loan.total_amount_number}), intereses incluidos, que debe y pagará en ${loan.cuotas_count_words} cuotas mensuales, iguales, siguientes y consecutivas de dólares billetes estadounidenses ${loan.cuota_amount_words} (${loan.cuota_amount_number}) cada una, venciendo la primera de ellas el día ${loan.first_due_text} y las siguientes los días ${loan.day_of_month_text} de cada mes.-`;

  if (loan.bank_payment_info) {
    text += ` ${loan.bank_payment_info}`;
  }

  text += ` SEGUNDO.- En garantía de pago de dicha suma, intereses y de todos los gastos y honorarios que la cobranza judicial o extrajudicial que la misma genere, así como del fiel cumplimiento de todas y cada una de las obligaciones contraídas por este contrato, sin perjuicio de la acción personal sobre todos los bienes, de conformidad con las disposiciones de la ley 12.367 del 8 de enero de 1957, ley 17.228 del 7 de enero de 2000, modificativas y concordantes; la parte deudora constituye DERECHO DE PRENDA SIN DESPLAZAMIENTO de la cosa a favor de la parte acreedora, quien acepta, sobre el siguiente vehículo automotor: ${vehicleDesc}.-  TERCERO.- La parte deudora se obliga respecto del bien prendado a: 1) No sacarlo del territorio nacional, no arrendarlo, gravarlo ni enajenarlo, sin previa autorización escrita de la parte acreedora.- 2) Asegurarlo y mantenerlo asegurado con póliza total que cubra todo tipo de riesgo ya sea civil, penal y otros, robo, incendio y daño propio o a terceros, en el BSE o la Institución Aseguradora que la parte acreedora indique y en las condiciones que exija por un monto no inferior al importe adecuado y se transfieran a favor de la parte acreedora todos los derechos que emerjan de la póliza respectiva.- 3) Cuidarlo y conservarlo en perfecto estado de funcionamiento, efectuando las reparaciones que fueren necesarias a juicio de la parte acreedora, quedando reservado a ésta el derecho a inspeccionarlo cuando lo desee a los efectos de comprobar el cumplimiento de esas obligaciones. 4) Guardarlo en el domicilio fijado en este contrato para ser inspeccionado por la parte acreedora, cuando esta lo desee, no pudiendo ser modificado el lugar sin previo consentimiento escrito de ésta. 5) No alterar el destino, aprovechamiento, ni sustituir las partes esenciales, motor, carrocería, etc, del bien prendado, sin previo consentimiento escrito de la parte acreedora, quedando una vez concedido, las partes que sustituyan o complementan a las originales comprendidas en este contrato de prenda. 6) Abonar de su cuenta y cargo con toda puntualidad, las primas de los seguros contra todo riesgo y todo lo que se adeuda o pueda adeudarse en el futuro por tributos nacionales y municipales que se refieren o afecten al bien dado en prenda, quedando facultada la parte acreedora para exigir en todo momento que acredite estar al día en el pago de los mismos. 7) Dejar depositados en poder de la parte acreedora el título de propiedad y demás documentación hasta que se pague totalmente el saldo adeudado. 8) Abonar de su cuenta y cargo el pago de cualquier tributo que recaiga sobre estas operaciones, el capital o sus intereses, existentes o a crearse y los daños y perjuicios, honorarios y demás gastos que se originen por la falta de cumplimiento a este contrato así como los devengados por éste los de su reinscripción y/o cancelación en su oportunidad.- CUARTO.- Exigibilidad Anticipada. La parte acreedora podrá dar por vencidos todos los plazos y exigir el pago de la deuda a su favor en su totalidad con más los intereses, ejecutando la garantía constituida en los siguientes casos: si la parte deudora no abonare a su vencimiento cualquiera de las cuotas a que se refiere la cláusula primera y/o faltare al cumplimiento de las obligaciones contraídas en la cláusula tercera.- QUINTO.- Si transcurridos 10 días del vencimiento de cualquiera de las cuotas previstas o de las obligaciones asumidas por la parte deudora, aquellas o estas no fueran satisfechas, el deudor se obliga a entregar el bien prendado en calidad de depósito al acreedor, en el plazo de 48 horas ante solo su requerimiento ya sea en forma personal o mediante telegrama colacionado.- SEXTO.- Para el caso de ejecución, la parte deudora renuncia a todos los trámites, términos y beneficios del juicio ejecutivo, así como a la tasación del vehículo, el que podrá ser vendido al mejor postor en remate, en la forma y condiciones y por el martillero que la parte acreedora designe, y acepta desde ya como cantidad líquida exigible la que resulte de la liquidación que formule esta. La parte acreedora podrá ejercer la acción personal sin esperar las resultancias de la ejecución prendaria.- SÉPTIMO.- La parte deudora caerá en mora de pleno derecho sin necesidad de interpelación judicial o extrajudicial alguna, por el solo vencimiento de los plazos pactados o por la realización u omisión de algún acto o hecho que se traduzca en hacer o no hacer algo contrario a lo estipulado.- OCTAVO.- El interés por mora se calculará a la tasa máxima resultante de las disposiciones legales aplicables.- NOVENO.- Para todos los efectos judiciales y/o extrajudiciales a que diere lugar este contrato, las partes fijan como domicilios especiales los indicados como suyos en la comparecencia y en caso de juicio serán competentes los jueces del domicilio fijado por la parte acreedora, siendo válida cualquier citación, notificación y/o intimación practicada mediante telegrama colacionado dirigido a los referidos domicilios.- DÉCIMO.- Las partes acuerdan que si por cualquier título vinieren a ser varios los propietarios del vehículo dado en prenda, convienen expresamente la solidaridad pasiva y la indivisibilidad del objeto de las obligaciones.- DÉCIMO PRIMERO.- La parte deudora declara bajo juramento NO ser contribuyente de aportes al BPS, NO ser sujeto pasivo de IRAE y NO ser sujeto pasivo de IMEBA.- DÉCIMO SEGUNDO.- Las partes solicitan a ${notaryTitle} ${notaryName} la certificación del otorgamiento y suscripción del presente contrato.-`;

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

  let body: PrendaRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const { ciudad, fecha, acreedor, deudor, loan, vehicle, notary_name, notary_gender = "f" } = body;

  if (!ciudad || !fecha || !deudor?.full_name || !deudor?.ci_number || !loan?.total_amount_words || !vehicle?.brand || !notary_name) {
    return NextResponse.json(
      { error: "Faltan campos requeridos: ciudad, fecha, deudor, loan, vehicle, notary_name" },
      { status: 400 }
    );
  }

  const templatePath = path.join(process.cwd(), "templates", "prenda.docx");
  let templateContent: Buffer;
  try {
    templateContent = readFileSync(templatePath);
  } catch {
    return NextResponse.json(
      { error: "Plantilla prenda.docx no encontrada en /templates/" },
      { status: 500 }
    );
  }

  const fechaLetras = formatDateLetras(fecha);
  const fullText = buildFullText(ciudad, fechaLetras, acreedor, deudor, loan, vehicle, notary_name, notary_gender);

  const acreodorFirmaName = acreedor.type === "company"
    ? `${acreedor.company_name}${acreedor.company_rep_name ? `\n${acreedor.company_rep_name}` : ""}`
    : (acreedor.full_name || "");

  const zip = new PizZip(templateContent);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

  doc.render({
    full_text: fullText,
    acreedor_firma_name: acreodorFirmaName,
    deudor_firma_name: deudor.full_name,
  });

  const buf = doc.getZip().generate({ type: "uint8array", compression: "DEFLATE" });
  const fileName = `prenda_${vehicle.plate || vehicle.padron || "vehiculo"}_${fecha}.docx`;

  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
