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
): string {
  if (seller.is_company) {
    let t = `1.PARTE VENDEDORA. – ${seller.company_name || "___"}, persona jurídica`;
    if (seller.rut) t += ` inscripta en el RUT de la DGI con el número ${seller.rut}`;
    t += `, con domicilio en ${seller.address || "___"}, departamento de ${seller.department || "___"}`;
    if (seller.representative_name) {
      t += `, representada en este acto por ${seller.representative_name}`;
      if (seller.representative_ci) t += `, con cédula de identidad número ${seller.representative_ci}`;
      if (seller.representative_address) t += `, domiciliado en ${seller.representative_address}`;
    }
    t += ".";
    return t;
  }

  // Two co-sellers (married couple)
  if (seller2) {
    let t = `1.PARTE VENDEDORA. – ${seller.full_name || "___"} y ${seller2.full_name || "___"}`;
    t += `, ${formatCivilStatusSimple(seller)}`;
    t += `, con C.I ${seller.ci_number || "___"} y ${seller2.ci_number || "___"} respectivamente`;
    t += `, ${seller.nationality || "orientales"}, mayores de edad`;
    t += `, domiciliados en ${seller.address || "___"}, departamento de ${seller.department || "___"}`;
    if (tx.seller_has_representative) {
      t += `, representado en este acto por ${tx.seller_representative_name || "___"}`;
      t += `, con cédula de identidad número ${tx.seller_representative_ci || "___"}`;
      t += ` y domicilio en ${tx.seller_representative_address || "___"}`;
    }
    t += ".";
    return t;
  }

  // Single person seller
  let t = `1.PARTE VENDEDORA. – ${seller.full_name || "___"}`;
  t += `, ${seller.nationality || "oriental"}, mayor de edad`;
  t += `, ${formatCivilStatusSimple(seller)}`;
  t += `, titular de la cédula de identidad número ${seller.ci_number || "___"}`;
  t += `, con domicilio en ${seller.address || "___"}, departamento de ${seller.department || "___"}`;
  if (tx.seller_has_representative) {
    t += `, representado en este acto por ${tx.seller_representative_name || "___"}`;
    t += `, con cédula de identidad número ${tx.seller_representative_ci || "___"}`;
    t += ` y domicilio en ${tx.seller_representative_address || "___"}`;
  }
  t += ".";
  return t;
}

function buildParteCompradora(
  buyer: Record<string, unknown>,
  buyer2: Record<string, unknown> | null,
  tx: Record<string, unknown>
): string {
  if (buyer.is_company) {
    let t = `2. PARTE COMPRADORA. – ${buyer.company_name || "___"}, persona jurídica`;
    if (buyer.rut) t += ` inscripta en el RUT de la DGI con el número ${buyer.rut}`;
    t += `, con domicilio en ${buyer.address || "___"}, departamento de ${buyer.department || "___"}`;
    if (buyer.representative_name) {
      t += `, representada en este acto por ${buyer.representative_name}`;
      if (buyer.representative_ci) t += `, con cédula de identidad número ${buyer.representative_ci}`;
      if (buyer.representative_address) t += `, domiciliado en ${buyer.representative_address}`;
    }
    t += ".";
    return t;
  }

  if (buyer2) {
    let t = `2. PARTE COMPRADORA. – ${buyer.full_name || "___"} y ${buyer2.full_name || "___"}`;
    t += `, ${formatCivilStatusSimple(buyer)}`;
    t += `, con C.I ${buyer.ci_number || "___"} y ${buyer2.ci_number || "___"} respectivamente`;
    t += `, ${buyer.nationality || "orientales"}, mayores de edad`;
    t += `, domiciliados en ${buyer.address || "___"}, departamento de ${buyer.department || "___"}`;
    t += ".";
    return t;
  }

  let t = `2. PARTE COMPRADORA. – ${buyer.full_name || "___"}`;
  t += `, ${buyer.nationality || "oriental"}, mayor de edad`;
  t += `, ${formatCivilStatusSimple(buyer)}`;
  t += `, titular de la cédula de identidad número ${buyer.ci_number || "___"}`;
  t += `, domiciliado en ${buyer.address || "___"}, departamento de ${buyer.department || "___"}`;
  if (tx.buyer_has_representative) {
    t += `, representado en este acto por ${tx.buyer_representative_name || "___"}`;
    t += `, con cédula de identidad número ${tx.buyer_representative_ci || "___"}`;
    t += ` y domicilio en ${tx.buyer_representative_address || "___"}`;
  }
  t += ".";
  return t;
}

function buildPrecioTexto(tx: Record<string, unknown>): string {
  const currency = tx.price_currency === "USD"
    ? "dólares estadounidenses"
    : "pesos uruguayos";
  const symbol = tx.price_currency === "USD" ? "U$S" : "$";
  const amount = tx.price_amount || "___";
  const words = tx.price_in_words || "___";
  let t = `5. PRECIO. - El precio de esta compraventa asciende a la suma de ${currency} ${String(words)} (${symbol} ${amount})`;

  switch (tx.payment_type) {
    case "contado":
      t += `, que se abona totalmente en este acto, al contado, suma por la cual se otorga total carta de pago.`;
      break;
    case "contado_cheque":
      t += `, que se abona totalmente en este acto, mediante cheque de ${tx.payment_bank_name || "___"}, suma por la cual se otorga total y eficaz carta de pago.`;
      break;
    case "contado_transferencia":
      t += `, que se abona totalmente en este acto, mediante transferencia bancaria de ${tx.payment_bank_name || "___"}, suma por la cual se otorga total carta de pago.`;
      break;
    case "saldo_precio":
      t += `, pagaderos en ${tx.payment_installments_count || "___"} cuotas de ${symbol} ${tx.payment_installment_amount || "___"} cada una. ${tx.payment_detail || ""}`;
      break;
    case "mixto":
      t += `, parte al contado (${symbol} ${tx.payment_cash_amount || "___"}) y ${tx.payment_detail || "saldo en cuotas"}, suma por la cual se otorga total carta de pago.`;
      break;
    default:
      t += `, que fueron abonados antes de este acto, suma por la cual la parte vendedora otorga total carta de pago.`;
  }
  return t;
}

function buildTradicionTexto(): string {
  return "6. TRADICIÓN. - Como tradición la parte vendedora trasmite a la parte compradora todos los derechos de propiedad y posesión que sobre el referido vehículo le corresponden, el que toma en este acto. -";
}

function buildDeclaracionTexto(tx: Record<string, unknown>): string {
  const bps = tx.bps_status as string;
  let t: string;
  if (bps === "si") {
    t = ". DECLARACIONES. - La parte vendedora: declara bajo juramento: SI ser contribuyente de BPS, IRAE y/o IMEBA.";
  } else {
    t = ". DECLARACIONES. - La parte vendedora: declara bajo juramento: NO ser contribuyente de BPS, IRAE, ni de IMEBA.-";
  }
  t += " La parte adquirente: i) Conoce que es su responsabilidad verificar que número de motor y chasis coincidan con el indicado en la libreta de circulación, exonerando de responsabilidad al Escribano actuante;";
  return t;
}

function buildDeclaracionResponsabilidadTexto(tx: Record<string, unknown>): string {
  let t = "La parte vendedora es responsable de toda obligación, gravamen, deudas por multas o patente de rodados, infracciones y demás responsabilidades civiles, tributarias y penales que puedan resultar del vehículo hasta el día de hoy.";
  if (tx.has_traffic_responsibility_clause) {
    t += ` Asimismo, ambas partes declaran que por multas de policía caminera y/o tránsito, el pago corresponde a la parte vendedora hasta el ${formatDate(tx.traffic_responsibility_date as string | null)}.`;
  }
  return t;
}

function buildSolicitudIntervencionTexto(
  tx: Record<string, unknown>,
  profile: Record<string, unknown>,
  seller: Record<string, unknown>,
  seller2: Record<string, unknown> | null,
  buyer: Record<string, unknown>,
  buyer2: Record<string, unknown> | null,
): string {
  const name = profile?.notary_name || profile?.full_name || "Franco Castiglioni";
  const firmas = buildFirmas(seller, seller2, buyer, buyer2, tx);
  return `10. SOLICITUD DE INTERVENCIÓN NOTARIAL. - Las partes solicitan al Escribano ${name}, que certifique el otorgamiento y suscripción de este contrato. - De conformidad las partes suscriben el mismo escrito en el lugar y fecha indicados ut supra. ${firmas.vendedor.replace("PARTE VENDEDORA- ", "")}. ${firmas.comprador.replace("PARTE COMPRADORA – ", "")}.`;
}

function buildCertificadoSeguroTexto(tx: Record<string, unknown>, profile: Record<string, unknown>): string {
  if (!tx.insurance_policy_number) return "";
  const city = profile?.city || "Maldonado";
  const date = formatDateLetras(tx.transaction_date as string | null);
  return `CERTIFICO QUE: Tuve a la vista Certificado de Seguro Obligatorio póliza número ${tx.insurance_policy_number}, expedido por ${tx.insurance_company || "___"} y vencimiento el ${formatDateShort(tx.insurance_expiry as string | null)}, dando cumplimento a la ley 18412. EN FE DE ELLO a solicitud de parte interesada y para su presentación ante quien corresponda expido el presente que sello, signo y firmo en ${city} el día ${date}.`;
}

function buildFirmas(
  seller: Record<string, unknown>,
  seller2: Record<string, unknown> | null,
  buyer: Record<string, unknown>,
  buyer2: Record<string, unknown> | null,
  tx: Record<string, unknown>
): { vendedor: string; comprador: string } {
  let v: string;
  if (seller.is_company && seller.representative_name) {
    v = `PARTE VENDEDORA- Hay una firma de ${String(seller.representative_name).toUpperCase()}`;
  } else if (seller2) {
    v = `PARTE VENDEDORA- Hay una firma de ${String(seller.full_name || "___").toUpperCase()} y otra de ${String(seller2.full_name || "___").toUpperCase()}`;
  } else if (tx.seller_has_representative) {
    v = `PARTE VENDEDORA- Hay una firma de ${String(tx.seller_representative_name || "___").toUpperCase()}`;
  } else {
    v = `PARTE VENDEDORA- Hay una firma de ${String(seller.full_name || "___").toUpperCase()}`;
  }

  let c: string;
  if (buyer.is_company && buyer.representative_name) {
    c = `PARTE COMPRADORA – Hay una firma de ${String(buyer.representative_name).toUpperCase()}`;
  } else if (buyer2) {
    c = `PARTE COMPRADORA – Hay una firma de ${String(buyer.full_name || "___").toUpperCase()} y otra de ${String(buyer2.full_name || "___").toUpperCase()}`;
  } else {
    c = `PARTE COMPRADORA – Hay una firma de ${String(buyer.full_name || "___").toUpperCase()}`;
  }
  return { vendedor: v, comprador: c };
}

function buildCertificoQue(
  seller: Record<string, unknown>,
  seller2: Record<string, unknown> | null,
  buyer: Record<string, unknown>,
  tx: Record<string, unknown>,
  profile: Record<string, unknown>
): string {
  // I) Authentication of signatures
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

  let t = `CERTIFICO QUE: I) Las firmas que anteceden son auténticas, fueron puestas en mi presencia y pertenecen a personas hábiles que no conozco, pero acreditaron su identidad con los documentos respectivos señores ${names.join(", ")}`;
  if (cis.length > 1) {
    t += `, titulares de la cédula de identidad número ${cis.join(" y ")} respectivamente`;
  } else {
    t += `, titular de la cédula de identidad número ${cis[0]}`;
  }
  t += `, cuyos demás datos surgen del documento que antecede, a quienes leí y así lo otorgaron.`;

  // II) Title chain
  if (tx.previous_owner_name || tx.previous_title_date) {
    const civilDesc = formatCivilStatusSimple(seller);
    t += ` II) La parte vendedora siendo ${civilDesc} hubo el bien que se enajena de ${tx.previous_owner_name || "___"}`;
    t += `, según documento privado de fecha ${formatDateShort(tx.previous_title_date as string | null)}`;
    t += ` certificado y protocolizado por el Escribano ${tx.previous_title_notary || "___"} en la misma fecha`;
    t += `, e inscripta en el Registro Mobiliario de ${tx.previous_title_registry || "___"} con el número ${tx.previous_title_number || "___"} el ${formatDateShort(tx.previous_title_registry_date as string | null)}.`;
  }

  // III) Power of attorney
  if (tx.seller_has_representative) {
    t += ` III) El señor ${tx.seller_representative_name || "___"}, lo hace en representación de ${seller.is_company ? seller.company_name : seller.full_name || "___"}`;
    t += ` según ${tx.seller_representative_power_type || "poder"} de fecha ${formatDateShort(tx.seller_representative_power_date as string | null)}`;
    t += ` certificado y protocolizado por el Escribano ${tx.seller_representative_power_notary || "___"} en la misma fecha`;
    t += `, con facultades para este acto y vigente a la fecha.`;
  }

  // Insurance
  if (tx.insurance_policy_number) {
    t += ` Tuve a la vista Certificado de Seguro Obligatorio póliza número ${tx.insurance_policy_number}`;
    t += ` expedido por ${tx.insurance_company || "___"}`;
    t += ` y vencimiento el ${formatDateShort(tx.insurance_expiry as string | null)}`;
    t += `, dando cumplimento a la ley 18412.`;
  }

  // BPS cert
  if (tx.bps_status === "si" && tx.bps_cert_number) {
    t += ` Tuve a la vista el Certificado Común número ${tx.bps_cert_number} expedido por el Banco de Previsión Social el ${formatDateShort(tx.bps_cert_date as string | null)}.`;
  }

  // CUD
  if (tx.cud_number) {
    t += ` Certificado Único Departamental (CUD) ${tx.cud_number} expedido el ${formatDateShort(tx.cud_date as string | null)}.`;
  }

  // Tax declaration
  if (tx.bps_status !== "si") {
    t += ` No se controla el Certificado Único Departamental en virtud de lo declarado por la parte vendedora, declaro no corresponder los impuestos de Irae e Imeba por no estar comprendido en la ley 17930 y su decreto reglamentario.`;
  }

  // Closing
  const city = profile?.city || "Maldonado";
  const date = formatDateLetras(tx.transaction_date as string | null);
  const initials = profile?.notary_initials || "F.C.";
  const name = profile?.notary_name || profile?.full_name || "Franco Castiglioni";
  t += ` EN FE DE ELLO a solicitud de parte interesada y para su presentación ante quien corresponda expido el presente que sello, signo y firmo en ${city} el día ${date}. ${initials} ${name}.`;

  return t;
}

function buildProtocolizacion(
  seller: Record<string, unknown>,
  seller2: Record<string, unknown> | null,
  buyer: Record<string, unknown>,
  tx: Record<string, unknown>,
  profile: Record<string, unknown>,
  vehicle: Record<string, unknown>
): string {
  const sellerName = seller.is_company
    ? String(seller.company_name || "___")
    : seller2
      ? `${seller.full_name || "___"} y otro`
      : String(seller.full_name || "___");
  const buyerName = buyer.is_company
    ? String(buyer.company_name || "___")
    : String(buyer.full_name || "___");
  const n = tx.matriz_number || "___";
  const city = profile?.city || "Maldonado";
  const date = formatDateLetras(tx.transaction_date as string | null);
  const initials = profile?.notary_initials || "F.C.";
  const name = profile?.notary_name || profile?.full_name || "Franco Castiglioni";
  const folioStart = tx.folio_start || "___";
  const folioEnd = tx.folio_end || "___";
  const padron = vehicle.padron || "___";
  const dept = vehicle.padron_department ? ` de ${vehicle.padron_department}` : "";

  let t = `Nº ${n} PROTOCOLIZACION PRECEPTIVA DE COMPRAVENTA AUTOMOTOR. ${sellerName} con ${buyerName}. En ${city} el día ${date}`;
  t += ` cumpliendo con lo dispuesto por el artículo 292 de la ley 18362 incorporo a mi Registro de Protocolizaciones compraventa automotor de padrón ${padron}${dept}`;
  t += ` con certificación y la presente con el número ${n}, extendida de folio ${folioStart} a ${folioEnd} vuelto.`;
  t += ` ${initials} ${name}`;
  return t;
}

function buildPrimerTestimonio(
  tx: Record<string, unknown>,
  profile: Record<string, unknown>
): string {
  const n = tx.matriz_number || "___";
  const city = profile?.city || "Maldonado";
  const date = formatDateLetras(tx.transaction_date as string | null);
  const serieProto = tx.paper_series_proto || "___";
  const numProto = tx.paper_number_proto || "___";
  const serieTest = tx.paper_series_testimony || "___";
  const numsTest = tx.paper_numbers_testimony || "___";

  let t = `ES PRIMER TESTIMONIO que he compulsado de la protocolización que incorpore a mi Registro con el número ${n}`;
  t += ` en hoja de papel notarial serie ${serieProto} número ${numProto}.`;
  t += ` EN FE DE ELLO y para la compradora expido el presente que sello signo y firmo en ${city} el día ${date}`;
  t += ` en hojas de papel notarial serie ${serieTest} número ${numsTest}.`;
  return t;
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
  const firmas = buildFirmas(seller, seller2, buyer, buyer2, tx);
  const cuotaParte = tx?.election_declaration || "1/1";

  // Build template data — all text blocks pre-formatted
  const data = {
    // Header
    ciudad: prof.city || "___",
    escribano_nombre: prof.notary_name || prof.full_name || "___",
    escribano_domicilio: prof.notary_address || "calle San Carlos 1093, Maldonado",

    // Dates
    fecha_letras: formatDateLetras(tx.transaction_date),

    // Clauses
    clausula_vendedora: buildParteVendedora(seller, seller2, tx),
    clausula_compradora: buildParteCompradora(buyer, buyer2, tx),
    cuota_parte: cuotaParte,

    // Main sections — pre-built text
    precio_texto: buildPrecioTexto(tx as unknown as Record<string, unknown>),
    tradicion_texto: buildTradicionTexto(),
    declaracion_texto: buildDeclaracionTexto(tx as unknown as Record<string, unknown>),
    declaracion_responsabilidad_texto: buildDeclaracionResponsabilidadTexto(tx as unknown as Record<string, unknown>),
    solicitud_intervencion_texto: buildSolicitudIntervencionTexto(tx as unknown as Record<string, unknown>, prof, seller, seller2, buyer, buyer2),

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

    // Signatures
    firmas_vendedor: firmas.vendedor,
    firmas_comprador: firmas.comprador,

    // Certification & protocol
    certifico_que: buildCertificoQue(seller, seller2, buyer, tx as unknown as Record<string, unknown>, prof),
    protocolizacion_texto: buildProtocolizacion(seller, seller2, buyer, tx as unknown as Record<string, unknown>, prof, vehicle),
    primer_testimonio: buildPrimerTestimonio(tx as unknown as Record<string, unknown>, prof),

    // Protocol numbers (used in template directly)
    matriz_numero: tx.matriz_number || "___",

    // Optional trailing insurance block
    certificado_seguro_texto: buildCertificadoSeguroTexto(tx as unknown as Record<string, unknown>, prof),
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
