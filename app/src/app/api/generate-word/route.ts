import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { readFileSync } from "fs";
import path from "path";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "___";
  const d = new Date(dateStr + "T12:00:00");
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre",
  ];
  return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
}

function formatCivilStatus(
  status: string,
  detail: string | null,
  nupcias: string | null,
  spouseName: string | null,
  divorceFicha: string | null,
  divorceYear: string | null,
  divorceCourt: string | null
): string {
  const map: Record<string, string> = {
    soltero: "soltero/a",
    divorciado: "divorciado/a",
    viudo: "viudo/a",
    casado: "casado/a",
    separado_bienes: "casado/a con separaci\u00f3n de bienes",
  };
  let text = map[status] || status;
  if (nupcias) {
    text += `, en ${nupcias} nupcias`;
  }
  if ((status === "casado" || status === "separado_bienes") && spouseName) {
    text += ` con ${spouseName}`;
  }
  if (detail) {
    text += ` ${detail}`;
  }
  if (status === "divorciado" && divorceFicha) {
    text += `, Ficha ${divorceFicha}`;
    if (divorceYear) text += ` del a\u00f1o ${divorceYear}`;
    if (divorceCourt) text += `, Juzgado ${divorceCourt}`;
  }
  return text;
}

function formatPayment(tx: Record<string, unknown>): string {
  const currency = tx.price_currency === "USD" ? "d\u00f3lares americanos" : "pesos uruguayos";
  switch (tx.payment_type) {
    case "contado":
      return `al contado, en efectivo, en este acto`;
    case "contado_cheque":
      return `al contado, mediante cheque de ${tx.payment_bank_name || "___"}`;
    case "contado_transferencia":
      return `al contado, mediante transferencia bancaria de ${tx.payment_bank_name || "___"}`;
    case "saldo_precio": {
      const count = tx.payment_installments_count || "___";
      const amount = tx.payment_installment_amount || "___";
      return `quedando un saldo de precio de ${count} cuotas de ${currency} ${amount} cada una. ${tx.payment_detail || ""}`;
    }
    case "mixto": {
      const cash = tx.payment_cash_amount || "___";
      return `parte al contado (${currency} ${cash}) y ${tx.payment_detail || "saldo en cuotas"}`;
    }
    case "tercero":
      return `paga un tercero: ${tx.payment_third_party_name || "___"} (CI ${tx.payment_third_party_ci || "___"}). ${tx.payment_detail || ""}`;
    default:
      return tx.payment_detail as string || "al contado";
  }
}

function formatTaxStatus(status: string): string {
  if (status === "si") return "es contribuyente";
  if (status === "no") return "no es contribuyente";
  return "no corresponde";
}

interface PlateHistoryEntry {
  department: string;
  padron: string;
  matricula: string;
  date: string;
}

function formatPlateHistory(entries: PlateHistoryEntry[]): string {
  if (!entries || entries.length === 0) return "";
  return entries
    .map(
      (e) =>
        `Depto. ${e.department || "___"}, Padrón ${e.padron || "___"}, Matrícula ${e.matricula || "___"}${e.date ? ` (${formatDate(e.date)})` : ""}`
    )
    .join("; ");
}

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

  const seller = tx.seller;
  const seller2 = tx.seller2;
  const buyer = tx.buyer;
  const buyer2 = tx.buyer2;
  const vehicle = tx.vehicle;

  // Helper to format civil status for a client record
  const fmtCS = (c: Record<string, unknown> | null) =>
    c
      ? formatCivilStatus(
          c.civil_status as string,
          c.civil_status_detail as string | null,
          c.nupcias_type as string | null,
          c.spouse_name as string | null,
          c.divorce_ficha as string | null,
          c.divorce_year as string | null,
          c.divorce_court as string | null
        )
      : "___";

  // Parse plate history entries
  let plateEntries: PlateHistoryEntry[] = [];
  if (tx.plate_history_entries) {
    try {
      plateEntries =
        typeof tx.plate_history_entries === "string"
          ? JSON.parse(tx.plate_history_entries)
          : tx.plate_history_entries;
    } catch {
      plateEntries = [];
    }
  }

  // Build template data
  const data = {
    // Date
    fecha: formatDate(tx.transaction_date),
    fecha_operacion: formatDate(tx.transaction_date),

    // Notary
    escribano_nombre: profile?.notary_name || profile?.full_name || "___",
    escribano_iniciales: profile?.notary_initials || "___",
    ciudad: profile?.city || "___",

    // Seller
    vendedor_nombre: seller?.full_name || "___",
    vendedor_ci: seller?.ci_number || "___",
    vendedor_nacionalidad: seller?.nationality || "___",
    vendedor_nacimiento: formatDate(seller?.birth_date || null),
    vendedor_lugar_nacimiento: seller?.birth_place || "___",
    vendedor_estado_civil: fmtCS(seller),
    vendedor_conyuge: seller?.spouse_name || "",
    vendedor_domicilio: seller?.address || "___",
    vendedor_departamento: seller?.department || "___",
    vendedor_es_empresa: seller?.is_company || false,
    vendedor_razon_social: seller?.company_name || "",
    vendedor_tipo_empresa: seller?.company_type || "",
    vendedor_rut: seller?.rut || "",
    vendedor_registro_nro: seller?.company_registry_number || "",
    vendedor_registro_folio: seller?.company_registry_folio || "",
    vendedor_registro_libro: seller?.company_registry_book || "",
    vendedor_objeto_social: seller?.company_business_purpose || "",
    vendedor_ley_19484: seller?.company_law_19484 || false,
    vendedor_rep_nombre: seller?.representative_name || "",
    vendedor_rep_ci: seller?.representative_ci || "",
    vendedor_rep_cargo: seller?.representative_role || "",
    vendedor_rep_domicilio: seller?.representative_address || "",

    // Seller 2 (spouse)
    hay_vendedor2: !!seller2,
    vendedor2_nombre: seller2?.full_name || "",
    vendedor2_ci: seller2?.ci_number || "",
    vendedor2_nacionalidad: seller2?.nationality || "",
    vendedor2_nacimiento: formatDate(seller2?.birth_date || null),
    vendedor2_lugar_nacimiento: seller2?.birth_place || "",
    vendedor2_estado_civil: fmtCS(seller2),
    vendedor2_domicilio: seller2?.address || "",
    vendedor2_departamento: seller2?.department || "",

    // Seller representative (apoderado)
    tiene_apoderado_vendedor: tx.seller_has_representative,
    apoderado_vendedor_nombre: tx.seller_representative_name || "",
    apoderado_vendedor_ci: tx.seller_representative_ci || "",
    apoderado_vendedor_domicilio: tx.seller_representative_address || "",
    apoderado_vendedor_poder_tipo: tx.seller_representative_power_type || "",
    apoderado_vendedor_poder_fecha: formatDate(tx.seller_representative_power_date),
    apoderado_vendedor_escribano: tx.seller_representative_power_notary || "",
    apoderado_vendedor_protocolo_fecha: formatDate(tx.seller_representative_power_protocol_date),
    apoderado_vendedor_sustitucion: tx.seller_representative_can_substitute || false,
    // Legacy aliases
    tiene_apoderado: tx.seller_has_representative,
    apoderado_nombre: tx.seller_representative_name || "",
    apoderado_ci: tx.seller_representative_ci || "",
    apoderado_domicilio: tx.seller_representative_address || "",

    // Buyer
    comprador_nombre: buyer?.full_name || "___",
    comprador_ci: buyer?.ci_number || "___",
    comprador_nacionalidad: buyer?.nationality || "___",
    comprador_nacimiento: formatDate(buyer?.birth_date || null),
    comprador_lugar_nacimiento: buyer?.birth_place || "___",
    comprador_estado_civil: fmtCS(buyer),
    comprador_conyuge: buyer?.spouse_name || "",
    comprador_domicilio: buyer?.address || "___",
    comprador_departamento: buyer?.department || "___",
    comprador_es_empresa: buyer?.is_company || false,
    comprador_razon_social: buyer?.company_name || "",
    comprador_tipo_empresa: buyer?.company_type || "",
    comprador_rut: buyer?.rut || "",
    comprador_registro_nro: buyer?.company_registry_number || "",
    comprador_registro_folio: buyer?.company_registry_folio || "",
    comprador_registro_libro: buyer?.company_registry_book || "",
    comprador_objeto_social: buyer?.company_business_purpose || "",
    comprador_ley_19484: buyer?.company_law_19484 || false,
    comprador_rep_nombre: buyer?.representative_name || "",
    comprador_rep_ci: buyer?.representative_ci || "",
    comprador_rep_cargo: buyer?.representative_role || "",
    comprador_rep_domicilio: buyer?.representative_address || "",

    // Buyer representative (apoderado)
    tiene_apoderado_comprador: tx.buyer_has_representative,
    apoderado_comprador_nombre: tx.buyer_representative_name || "",
    apoderado_comprador_ci: tx.buyer_representative_ci || "",
    apoderado_comprador_domicilio: tx.buyer_representative_address || "",
    apoderado_comprador_poder_tipo: tx.buyer_representative_power_type || "",
    apoderado_comprador_poder_fecha: formatDate(tx.buyer_representative_power_date),
    apoderado_comprador_escribano: tx.buyer_representative_power_notary || "",
    apoderado_comprador_protocolo_fecha: formatDate(tx.buyer_representative_power_protocol_date),
    apoderado_comprador_sustitucion: tx.buyer_representative_can_substitute || false,

    // Buyer 2
    hay_comprador2: !!buyer2,
    comprador2_nombre: buyer2?.full_name || "",
    comprador2_ci: buyer2?.ci_number || "",
    comprador2_nacionalidad: buyer2?.nationality || "",
    comprador2_nacimiento: formatDate(buyer2?.birth_date || null),
    comprador2_lugar_nacimiento: buyer2?.birth_place || "",
    comprador2_estado_civil: fmtCS(buyer2),
    comprador2_domicilio: buyer2?.address || "",
    comprador2_departamento: buyer2?.department || "",

    // Vehicle
    vehiculo_marca: vehicle?.brand || "___",
    vehiculo_modelo: vehicle?.model || "___",
    vehiculo_anio: vehicle?.year || "___",
    vehiculo_tipo: vehicle?.type || "___",
    vehiculo_combustible: vehicle?.fuel || "___",
    vehiculo_cilindrada: vehicle?.cylinders || "___",
    vehiculo_motor: vehicle?.motor_number || "___",
    vehiculo_chasis: vehicle?.chassis_number || "___",
    vehiculo_matricula: vehicle?.plate || "___",
    vehiculo_padron: vehicle?.padron || "___",
    vehiculo_padron_depto: vehicle?.padron_department || "___",
    vehiculo_codigo_nacional: vehicle?.national_code || "___",
    vehiculo_afectacion: vehicle?.affectation || "___",
    vehiculo_titular: vehicle?.owner_name || "___",
    vehiculo_titular_ci: vehicle?.owner_ci || "___",

    // Price
    precio_monto: tx.price_amount || "___",
    precio_moneda: tx.price_currency === "USD" ? "d\u00f3lares americanos" : "pesos uruguayos",
    precio_moneda_simbolo: tx.price_currency === "USD" ? "USD" : "$",
    precio_letras: tx.price_in_words || "___",
    forma_pago: formatPayment(tx as unknown as Record<string, unknown>),
    pago_tipo: tx.payment_type || "contado",
    pago_contado: tx.payment_type === "contado" || tx.payment_type === "contado_cheque" || tx.payment_type === "contado_transferencia",
    pago_financiado: tx.payment_type === "saldo_precio",
    pago_detalle: tx.payment_detail || "",

    // Taxes (3-state)
    bps_texto: formatTaxStatus(tx.bps_status || "no_corresponde"),
    irae_texto: formatTaxStatus(tx.irae_status || "no_corresponde"),
    imeba_texto: formatTaxStatus(tx.imeba_status || "no_corresponde"),
    es_contribuyente_bps: tx.bps_status === "si",
    es_contribuyente_irae: tx.irae_status === "si",
    es_contribuyente_imeba: tx.imeba_status === "si",
    no_contribuyente_bps: tx.bps_status === "no",
    no_contribuyente_irae: tx.irae_status === "no",
    no_contribuyente_imeba: tx.imeba_status === "no",
    bps_cert_numero: tx.bps_cert_number || "",
    bps_cert_fecha: formatDate(tx.bps_cert_date),
    cud_numero: tx.cud_number || "",
    cud_fecha: formatDate(tx.cud_date),

    // Previous title
    anterior_tipo: tx.previous_title_type || "compraventa",
    anterior_primera_inscripcion: tx.previous_title_is_first_registration || false,
    anterior_propietario: tx.previous_owner_name || "___",
    anterior_fecha: formatDate(tx.previous_title_date),
    anterior_escribano: tx.previous_title_notary || "___",
    anterior_mismo_escribano: tx.previous_title_same_notary,
    anterior_registro: tx.previous_title_registry || "___",
    anterior_numero: tx.previous_title_number || "___",
    anterior_fecha_registro: formatDate(tx.previous_title_registry_date),

    // Insurance
    seguro_poliza: tx.insurance_policy_number || "___",
    seguro_compania: tx.insurance_company || "___",
    seguro_vigencia: formatDate(tx.insurance_expiry),
    seguro_separado: tx.insurance_separate_cert,

    // Plate history
    tiene_historial_matricula: tx.has_plate_history,
    historial_matricula: formatPlateHistory(plateEntries),
    historial_matricula_entries: plateEntries,

    // Extra clauses
    declaracion_eleccion: tx.election_declaration || "",
    tiene_clausula_transito: tx.has_traffic_responsibility_clause || false,
    fecha_responsabilidad_transito: formatDate(tx.traffic_responsibility_date),

    // Protocalizaci\u00f3n
    matriz_numero: tx.matriz_number || "___",
    folio_inicio: tx.folio_start || "___",
    folio_fin: tx.folio_end || "___",
    papel_serie_proto: tx.paper_series_proto || "___",
    papel_numero_proto: tx.paper_number_proto || "___",
    papel_serie_testimonio: tx.paper_series_testimony || "___",
    papel_numeros_testimonio: tx.paper_numbers_testimony || "___",
    fecha_protocolizacion: formatDate(tx.protocolization_date),
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
