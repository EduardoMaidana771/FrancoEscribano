import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { readFileSync } from "fs";
import path from "path";

// ─── FORMAT HELPERS ──────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "___";
  const d = new Date(dateStr + "T12:00:00");
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre",
  ];
  return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
}

function formatDateLetras(dateStr: string | null): string {
  if (!dateStr) return "___";
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

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return "___";
  const d = new Date(dateStr + "T12:00:00");
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function formatCivilStatusSimple(c: Record<string, unknown>): string {
  const map: Record<string, string> = {
    soltero: "soltero/a",
    casado: "casado/a",
    divorciado: "divorciado/a",
    viudo: "viudo/a",
    separado_bienes: "casado/a con separación judicial de bienes",
  };
  const status = c.civil_status as string;
  let text = map[status] || String(status || "___");
  if ((status === "casado" || status === "separado_bienes") && c.nupcias_type) {
    text += ` en ${c.nupcias_type} nupcias`;
    if (c.spouse_name) text += ` con ${c.spouse_name}`;
  }
  return text;
}

// ─── TEXT BLOCK BUILDERS ─────────────────────────────────────

function buildParteVendedora(
  seller: Record<string, unknown>,
  seller2: Record<string, unknown> | null,
  tx: Record<string, unknown>
): { titulo: string; texto: string } {
  if (seller.is_company) {
    const name = String(seller.company_name || "___");
    let texto = ", persona jurídica";
    if (seller.rut) texto += ` inscripta en el RUT de la DGI con el número ${seller.rut}`;
    texto += `, con domicilio en ${seller.address || "___"}, departamento de ${seller.department || "___"}`;
    if (seller.representative_name) {
      texto += `, representada en este acto por ${seller.representative_name}`;
      if (seller.representative_ci) texto += `, con cédula de identidad número ${seller.representative_ci}`;
      if (seller.representative_address) texto += `, domiciliado en ${seller.representative_address}`;
    }
    texto += ".";
    return { titulo: `1.PARTE VENDEDORA. – ${name}`, texto };
  }

  if (seller2) {
    const name = `${seller.full_name || "___"} y ${seller2.full_name || "___"}`;
    let texto = `, ${formatCivilStatusSimple(seller)}`;
    texto += `, con C.I ${seller.ci_number || "___"} y ${seller2.ci_number || "___"} respectivamente`;
    texto += `, ${seller.nationality || "orientales"}, mayores de edad`;
    texto += `, domiciliados en ${seller.address || "___"}, departamento de ${seller.department || "___"}`;
    if (tx.seller_has_representative) {
      texto += `, representado en este acto por ${tx.seller_representative_name || "___"}`;
      texto += `, con cédula de identidad número ${tx.seller_representative_ci || "___"}`;
      texto += ` y domicilio en ${tx.seller_representative_address || "___"}`;
    }
    texto += ".";
    return { titulo: `1.PARTE VENDEDORA. – ${name}`, texto };
  }

  const name = String(seller.full_name || "___");
  let texto = `, ${seller.nationality || "oriental"}, mayor de edad`;
  texto += `, ${formatCivilStatusSimple(seller)}`;
  texto += `, titular de la cédula de identidad número ${seller.ci_number || "___"}`;
  texto += `, domiciliado en la calle ${seller.address || "___"}, departamento de ${seller.department || "___"}`;
  if (tx.seller_has_representative) {
    texto += `, representado en este acto por ${tx.seller_representative_name || "___"}`;
    texto += `, con cédula de identidad número ${tx.seller_representative_ci || "___"}`;
    texto += ` y domicilio en ${tx.seller_representative_address || "___"}`;
  }
  texto += ".";
  return { titulo: `1.PARTE VENDEDORA. – ${name}`, texto };
}

function buildParteCompradora(
  buyer: Record<string, unknown>,
  buyer2: Record<string, unknown> | null,
  tx: Record<string, unknown>
): { titulo: string; texto: string } {
  if (buyer.is_company) {
    const name = String(buyer.company_name || "___");
    let texto = ", persona jurídica";
    if (buyer.rut) texto += ` inscripta en el RUT de la DGI con el número ${buyer.rut}`;
    texto += `, con domicilio en ${buyer.address || "___"}, departamento de ${buyer.department || "___"}`;
    if (buyer.representative_name) {
      texto += `, representada en este acto por ${buyer.representative_name}`;
      if (buyer.representative_ci) texto += `, con cédula de identidad número ${buyer.representative_ci}`;
      if (buyer.representative_address) texto += `, domiciliado en ${buyer.representative_address}`;
    }
    texto += ".";
    return { titulo: `2. PARTE COMPRADORA. – ${name}`, texto };
  }

  if (buyer2) {
    const name = `${buyer.full_name || "___"} y ${buyer2.full_name || "___"}`;
    let texto = `, ${formatCivilStatusSimple(buyer)}`;
    texto += `, con C.I ${buyer.ci_number || "___"} y ${buyer2.ci_number || "___"} respectivamente`;
    texto += `, ${buyer.nationality || "orientales"}, mayores de edad`;
    texto += `, domiciliados en ${buyer.address || "___"}, departamento de ${buyer.department || "___"}`;
    texto += ".";
    return { titulo: `2. PARTE COMPRADORA. – ${name}`, texto };
  }

  const name = String(buyer.full_name || "___");
  let texto = `, ${buyer.nationality || "oriental"}, mayor de edad`;
  texto += `, titular de la cedula de identidad número ${buyer.ci_number || "___"}`;
  texto += `, ${formatCivilStatusSimple(buyer)}`;
  texto += `, domiciliado en la calle ${buyer.address || "___"}, Departamento de ${buyer.department || "___"}`;
  if (tx.buyer_has_representative) {
    texto += `, representado en este acto por ${tx.buyer_representative_name || "___"}`;
    texto += `, con cédula de identidad número ${tx.buyer_representative_ci || "___"}`;
    texto += ` y domicilio en ${tx.buyer_representative_address || "___"}`;
  }
  texto += ".";
  return { titulo: `2. PARTE COMPRADORA. – ${name}`, texto };
}

function buildPrecio(tx: Record<string, unknown>): {
  moneda: string;
  monto: string;
  pago: string;
} {
  const moneda = tx.price_currency === "USD"
    ? "dólares estadounidenses"
    : "pesos uruguayos";
  const symbol = tx.price_currency === "USD" ? "U$S" : "$";
  const amount = tx.price_amount || "___";
  const words = tx.price_in_words || "___";
  const monto = `${String(words)} (${symbol} ${amount}, oo)`;

  let pago: string;
  switch (tx.payment_type) {
    case "contado":
      pago = `, pagaderos al contado, en este acto, suma por la cual la parte vendedora entrega a la parte compradora carta total y eficaz de pago por el total del precio estipulado, declarando no tener más nada que reclamar por ningún concepto. -`;
      break;
    case "contado_cheque":
      pago = `, que se abona totalmente en este acto, mediante cheque de ${tx.payment_bank_name || "___"}, suma por la cual se otorga total y eficaz carta de pago.`;
      break;
    case "contado_transferencia":
      pago = `, que se abona totalmente en este acto, mediante transferencia bancaria de ${tx.payment_bank_name || "___"}, suma por la cual se otorga total carta de pago.`;
      break;
    case "saldo_precio":
      pago = `, pagaderos en ${tx.payment_installments_count || "___"} cuotas de ${symbol} ${tx.payment_installment_amount || "___"} cada una. ${tx.payment_detail || ""}`;
      break;
    case "mixto":
      pago = `, parte al contado (${symbol} ${tx.payment_cash_amount || "___"}) y ${tx.payment_detail || "saldo en cuotas"}, suma por la cual se otorga total carta de pago.`;
      break;
    default:
      pago = `, que fueron abonados antes de este acto, suma por la cual la parte vendedora otorga total carta de pago.`;
  }
  return { moneda, monto, pago };
}

function buildDeclaracionBps(bpsStatus: string | unknown): string {
  if (bpsStatus === "si") {
    return "SI ser contribuyente de BPS, IRAE y/o IMEBA.";
  }
  return "NO ser contribuyente de BPS, IRAE, ni de IMEBA.-";
}

function buildDeclaracionResponsabilidadTexto(tx: Record<string, unknown>): string {
  let t = "La parte vendedora es responsable de toda obligación, gravamen, deudas por multas o patente de rodados, infracciones y demás responsabilidades civiles, tributarias y penales que puedan resultar del vehículo hasta el día de hoy.";
  if (tx.has_traffic_responsibility_clause) {
    t += ` Asimismo, ambas partes declaran que por multas de policía caminera y/o tránsito, el pago corresponde a la parte vendedora hasta el ${formatDate(tx.traffic_responsibility_date as string | null)}.`;
  }
  return t;
}

function buildFirmasTexto(
  seller: Record<string, unknown>,
  seller2: Record<string, unknown> | null,
  buyer: Record<string, unknown>,
  buyer2: Record<string, unknown> | null,
  tx: Record<string, unknown>
): string {
  const signers: string[] = [];

  // Seller signer(s)
  if (seller.is_company && seller.representative_name) {
    signers.push(String(seller.representative_name));
  } else if (tx.seller_has_representative) {
    signers.push(String(tx.seller_representative_name || "___"));
  } else {
    signers.push(String(seller.full_name || "___"));
    if (seller2) signers.push(String(seller2.full_name || "___"));
  }

  // Buyer signer(s)
  if (buyer.is_company && buyer.representative_name) {
    signers.push(String(buyer.representative_name));
  } else {
    signers.push(String(buyer.full_name || "___"));
    if (buyer2) signers.push(String(buyer2.full_name || "___"));
  }

  if (signers.length === 1) {
    return `Hay una firma de ${signers[0]}.`;
  }
  let result = `Hay una firma de ${signers[0]}`;
  for (let i = 1; i < signers.length; i++) {
    if (i === signers.length - 1) {
      result += ` y otra de ${signers[i]}`;
    } else {
      result += `, otra de ${signers[i]}`;
    }
  }
  return result + ".";
}

function buildCertificoQue(
  seller: Record<string, unknown>,
  seller2: Record<string, unknown> | null,
  buyer: Record<string, unknown>,
  tx: Record<string, unknown>,
): { nombres: string; cedulas_texto: string; secciones: string } {
  // Collect signer names and CIs
  const names: string[] = [];
  const cis: string[] = [];
  if (tx.seller_has_representative) {
    names.push(String(tx.seller_representative_name || "___"));
    cis.push(String(tx.seller_representative_ci || "___"));
  } else if (seller.is_company && seller.representative_name) {
    names.push(String(seller.representative_name));
    cis.push(String(seller.representative_ci || "___"));
  } else {
    names.push(String(seller.full_name || "___"));
    cis.push(String(seller.ci_number || "___"));
    if (seller2) {
      names.push(String(seller2.full_name || "___"));
      cis.push(String(seller2.ci_number || "___"));
    }
  }
  if (buyer.is_company && buyer.representative_name) {
    names.push(String(buyer.representative_name));
    cis.push(String(buyer.representative_ci || "___"));
  } else {
    names.push(String(buyer.full_name || "___"));
    cis.push(String(buyer.ci_number || "___"));
  }

  // nombres: bold in template — includes trailing ", "
  const nombres = names.join(" y ") + ", ";

  // cedulas_texto: normal text
  let cedulas_texto: string;
  if (cis.length > 1) {
    cedulas_texto = `titulares de la cedula de identidad número ${cis.join(" y ")} respectivamente`;
  } else {
    cedulas_texto = `titular de la cédula de identidad número ${cis[0]}`;
  }
  cedulas_texto += `, cuyos demás datos surgen del documento que antecede, a quienes leí y así lo otorgaron.`;

  // secciones: conditional numbered sections (II, III, IV, etc.)
  let secciones = "";

  // II) Title chain
  if (tx.previous_owner_name || tx.previous_title_date) {
    const civilDesc = formatCivilStatusSimple(seller);
    secciones += ` II) La parte vendedora siendo ${civilDesc} hubo el bien que se enajena de ${tx.previous_owner_name || "___"}`;
    secciones += `, según documento privado de fecha ${formatDateShort(tx.previous_title_date as string | null)}`;
    secciones += ` certificado y protocolizado por el Escribano ${tx.previous_title_notary || "___"} en la misma fecha`;
    secciones += `, e inscripta en el Registro Mobiliario de ${tx.previous_title_registry || "___"} con el número ${tx.previous_title_number || "___"} el ${formatDateShort(tx.previous_title_registry_date as string | null)}.`;
  }

  // III) Power of attorney
  if (tx.seller_has_representative) {
    secciones += ` III) El señor ${tx.seller_representative_name || "___"}, lo hace en representación de ${seller.is_company ? seller.company_name : seller.full_name || "___"}`;
    secciones += ` según ${tx.seller_representative_power_type || "poder"} de fecha ${formatDateShort(tx.seller_representative_power_date as string | null)}`;
    secciones += ` certificado y protocolizado por el Escribano ${tx.seller_representative_power_notary || "___"} en la misma fecha`;
    secciones += `, con facultades para este acto y vigente a la fecha.`;
  }

  // Insurance
  if (tx.insurance_policy_number) {
    secciones += ` Tuve a la vista Certificado de Seguro Obligatorio póliza número ${tx.insurance_policy_number}`;
    secciones += ` expedido por ${tx.insurance_company || "___"}`;
    secciones += ` y vencimiento el ${formatDateShort(tx.insurance_expiry as string | null)}`;
    secciones += `, dando cumplimento a la ley 18412.`;
  }

  // BPS cert
  if (tx.bps_status === "si" && tx.bps_cert_number) {
    secciones += ` Tuve a la vista el Certificado Común número ${tx.bps_cert_number} expedido por el Banco de Previsión Social el ${formatDateShort(tx.bps_cert_date as string | null)}.`;
  }

  // CUD
  if (tx.cud_number) {
    secciones += ` Certificado Único Departamental (CUD) ${tx.cud_number} expedido el ${formatDateShort(tx.cud_date as string | null)}.`;
  }

  // Tax declaration
  if (tx.bps_status !== "si") {
    secciones += ` No se controla el Certificado Único Departamental en virtud de lo declarado por la parte vendedora, declaro no corresponder los impuestos de Irae e Imeba por no estar comprendido en la ley 17930 y su decreto reglamentario.`;
  }

  return { nombres, cedulas_texto, secciones };
}

function buildProtoPartes(
  seller: Record<string, unknown>,
  seller2: Record<string, unknown> | null,
  buyer: Record<string, unknown>
): string {
  const sellerName = seller.is_company
    ? String(seller.company_name || "___")
    : seller2
      ? `${seller.full_name || "___"} y otro`
      : String(seller.full_name || "___");
  const buyerName = buyer.is_company
    ? String(buyer.company_name || "___")
    : String(buyer.full_name || "___");
  return `${sellerName} con ${buyerName}.`;
}

// ─── TYPES ───────────────────────────────────────────────────

// ─── MAIN HANDLER ────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { transactionId } = await request.json();

  if (!transactionId) {
    return NextResponse.json(
      { error: "transactionId requerido" },
      { status: 400 }
    );
  }

  // Fetch full transaction with joined data
  const { data: tx, error: txErr } = await supabase
    .from("transactions")
    .select(`
      *,
      seller:clients!transactions_seller_id_fkey(*),
      seller2:clients!transactions_seller2_id_fkey(*),
      buyer:clients!transactions_buyer_id_fkey(*),
      buyer2:clients!transactions_buyer2_id_fkey(*),
      vehicle:vehicles!transactions_vehicle_id_fkey(*)
    `)
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .single();

  if (txErr || !tx) {
    return NextResponse.json(
      { error: "Transacción no encontrada" },
      { status: 404 }
    );
  }

  // Fetch profile for notary info
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Load template
  const templatePath = path.join(
    process.cwd(),
    "templates",
    "compraventa.docx"
  );

  let templateContent: Buffer;
  try {
    templateContent = readFileSync(templatePath);
  } catch {
    return NextResponse.json(
      { error: "Plantilla no encontrada. Coloque compraventa.docx en /templates/" },
      { status: 500 }
    );
  }

  const zip = new PizZip(templateContent);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  const seller = tx.seller as Record<string, unknown>;
  const seller2 = tx.seller2 as Record<string, unknown> | null;
  const buyer = tx.buyer as Record<string, unknown>;
  const buyer2 = tx.buyer2 as Record<string, unknown> | null;
  const vehicle = tx.vehicle as Record<string, unknown>;
  const prof = (profile || {}) as Record<string, unknown>;

  // Build firmas
  const cuotaParte = tx?.election_declaration || "1/1";
  const vendedora = buildParteVendedora(seller, seller2, tx);
  const compradora = buildParteCompradora(buyer, buyer2, tx);
  const precio = buildPrecio(tx as unknown as Record<string, unknown>);
  const certQ = buildCertificoQue(seller, seller2, buyer, tx as unknown as Record<string, unknown>);
  const initials = String(prof.notary_initials || "F.C.");
  const notaryName = String(prof.notary_name || prof.full_name || "Franco Castiglioni");

  // Build template data — split at bold boundaries
  const data = {
    // Ciudad y fecha
    ciudad: prof.city || "___",
    fecha_letras: formatDateLetras(tx.transaction_date),

    // Notary
    notary_name: notaryName,
    notary_firma: `${initials} ${notaryName}.`,
    notary_firma_short: `${initials} ${notaryName}`,

    // Cláusula 1 - Vendedora (titulo=bold, texto=normal)
    vendedora_titulo: vendedora.titulo,
    vendedora_texto: vendedora.texto,

    // Cláusula 2 - Compradora (titulo=bold, texto=normal)
    compradora_titulo: compradora.titulo,
    compradora_texto: compradora.texto,

    // Cláusula 4 - Cuota parte
    cuota_parte: cuotaParte,

    // Cláusula 5 - Precio (moneda=normal, monto=bold, pago=normal)
    precio_moneda: precio.moneda,
    precio_monto: precio.monto,
    precio_pago: precio.pago,

    // Cláusula 9 - Declaraciones
    declaracion_bps: buildDeclaracionBps(tx.bps_status),

    // Responsabilidad
    declaracion_responsabilidad_texto: buildDeclaracionResponsabilidadTexto(tx as unknown as Record<string, unknown>),

    // Cláusula 10 - Firmas (bold)
    firmas_texto: buildFirmasTexto(seller, seller2, buyer, buyer2, tx as unknown as Record<string, unknown>),

    // Certifico que (nombres=bold, rest=normal)
    certifico_nombres: certQ.nombres,
    certifico_cedulas_texto: certQ.cedulas_texto,
    certifico_secciones: certQ.secciones,

    // Protocolización
    proto_partes: buildProtoPartes(seller, seller2, buyer),

    // Vehicle table
    vehicle_type: vehicle.type || "___",
    vehicle_brand: vehicle.brand || "___",
    vehicle_model: vehicle.model || "___",
    vehicle_year: vehicle.year || "___",
    vehicle_padron: vehicle.padron || "___",
    vehicle_padron_department: vehicle.padron_department || "___",
    vehicle_plate: vehicle.plate || "___",
    vehicle_motor: vehicle.motor_number || "___",
    vehicle_fuel: vehicle.fuel || "___",
    vehicle_chassis: vehicle.chassis_number || "___",
    vehicle_cylinders: vehicle.cylinders || "___",

    // Protocol numbers
    matriz_numero: tx.matriz_number || "___",
    folio_start: tx.folio_start || "___",
    folio_end: tx.folio_end || "___",

    // Paper
    paper_series_proto: tx.paper_series_proto || "___",
    paper_number_proto: tx.paper_number_proto || "___",
    paper_series_testimony: tx.paper_series_testimony || "___",
    paper_numbers_testimony: tx.paper_numbers_testimony || "___",

    // Insurance (conditional via {#has_insurance} in template)
    has_insurance: !!tx.insurance_policy_number,
    insurance_policy: tx.insurance_policy_number || "___",
    insurance_company: tx.insurance_company || "___",
    insurance_expiry: formatDateShort(tx.insurance_expiry as string | null),
  };

  doc.render(data);

  const buf = doc.getZip().generate({
    type: "uint8array",
    compression: "DEFLATE",
  });

  const fileName = `compraventa_${vehicle?.plate || "sin_matricula"}_${new Date().toISOString().split("T")[0]}.docx`;

  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
