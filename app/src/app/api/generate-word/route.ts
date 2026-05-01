import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { readFileSync } from "fs";
import path from "path";

// ─── FORMAT HELPERS ──────────────────────────────────────────

function toRoman(n: number): string {
  const map = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  return map[n - 1] || String(n);
}

function toNationalitySingular(nat: string | unknown): string {
  const n = String(nat || "").toLowerCase().trim();
  if (n === "uruguaya" || n === "uruguayo" || n === "oriental" || n === "") return "oriental";
  return String(nat || "oriental");
}

function toNationalityPlural(nat1: string | unknown, nat2?: string | unknown): string {
  const n1 = String(nat1 || "").toLowerCase().trim();
  const n2 = nat2 ? String(nat2).toLowerCase().trim() : n1;
  const pluralMap: Record<string, string> = {
    uruguaya: "orientales", uruguayo: "orientales", oriental: "orientales",
    argentina: "argentinos", argentino: "argentinos",
    "brasileña": "brasileños", "brasileño": "brasileños",
    paraguaya: "paraguayos", paraguayo: "paraguayos",
    colombiana: "colombianos", colombiano: "colombianos",
    venezolana: "venezolanos", venezolano: "venezolanos",
    chilena: "chilenos", chileno: "chilenos",
    boliviana: "bolivianos", boliviano: "bolivianos",
    peruana: "peruanos", peruano: "peruanos",
    ecuatoriana: "ecuatorianos", ecuatoriano: "ecuatorianos",
  };
  if (n1 === "" && n2 === "") return "orientales";
  if (n1 === n2 || n2 === "") return pluralMap[n1] || pluralMap[n2] || String(nat1 || "orientales");
  return `${toNationalitySingular(n1)} y ${toNationalitySingular(n2)}`;
}

function normalizeNupcias(nupcias: string | unknown): string {
  const map: Record<string, string> = {
    unicas: "únicas", primeras: "primeras", segundas: "segundas", terceras: "terceras",
  };
  return map[String(nupcias || "")] || String(nupcias || "únicas");
}

function formatAmount(amount: unknown): string {
  const n = parseFloat(String(amount));
  if (isNaN(n)) return String(amount || "___");
  return n.toLocaleString("es-UY", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function buildPlateHistoryText(
  entries: Array<{ department: string; padron: string; matricula: string; date?: string }>
): string {
  return entries
    .map((e, i) => {
      const dept = e.department || "___";
      const padron = e.padron || "___";
      const mat = e.matricula || "___";
      if (i === 0) return `El vehículo fue empadronado en ${dept} con el número ${padron} y matrícula ${mat}`;
      return `Luego fue re empadronado en ${dept} con el número ${padron} y matrícula ${mat}`;
    })
    .join(". ") + ".";
}

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

function normalizeGender(value: unknown): "M" | "F" | null {
  const normalized = String(value || "").trim().toUpperCase();
  return normalized === "M" || normalized === "F" ? normalized : null;
}

function formatCivilStatusSimple(c: Record<string, unknown>): string {
  const status = c.civil_status as string;
  const gender = normalizeGender(c.gender);
  const map: Record<string, string> = {
    soltero: gender === "M" ? "soltero" : gender === "F" ? "soltera" : "soltero/a",
    casado: gender === "M" ? "casado" : gender === "F" ? "casada" : "casado/a",
    divorciado: gender === "M" ? "divorciado" : gender === "F" ? "divorciada" : "divorciado/a",
    viudo: gender === "M" ? "viudo" : gender === "F" ? "viuda" : "viudo/a",
    separado_bienes:
      gender === "M"
        ? "casado con separación judicial de bienes"
        : gender === "F"
          ? "casada con separación judicial de bienes"
          : "casado/a con separación judicial de bienes",
  };
  let text = map[status] || String(status || "___");
  if ((status === "casado" || status === "separado_bienes") && c.nupcias_type) {
    text += ` en ${normalizeNupcias(c.nupcias_type)} nupcias`;
    if (c.spouse_name) text += ` con ${c.spouse_name}`;
  } else if ((status === "divorciado" || status === "viudo") && c.nupcias_type) {
    text += ` de sus ${normalizeNupcias(c.nupcias_type)} nupcias`;
    if (c.spouse_name) text += ` de ${c.spouse_name}`;
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
    texto += `, con domicilio en ${seller.address || "___"}, departamento de ${seller.department || "___"}`;
    if (seller.rut) texto += `, inscripta en el RUT de la DGI con el número ${seller.rut}`;
    if (seller.representative_name) {
      texto += `, representada en este acto por`;
      if (seller.representative_role) texto += ` su ${seller.representative_role}`;
      texto += ` ${seller.representative_name}`;
      if (seller.representative_ci) texto += `, con cédula de identidad número ${seller.representative_ci}`;
      if (seller.representative_address) texto += `, domiciliado en ${seller.representative_address}`;
    }
    texto += ".";
    return { titulo: `1.PARTE VENDEDORA. – ${name}`, texto };
  }

  if (seller2) {
    const name = `${seller.full_name || "___"} y ${seller2.full_name || "___"}`;
    const nup1 = seller.nupcias_type as string;
    const nup2 = seller2.nupcias_type as string;
    const nupciasDesc = (nup1 && nup2 && nup1 !== nup2)
      ? `en ${normalizeNupcias(nup1)} y ${normalizeNupcias(nup2)} nupcias respectivamente`
      : `en ${normalizeNupcias(nup1 || "unicas")} nupcias`;
    const natPlural = toNationalityPlural(seller.nationality, seller2.nationality);
    let texto = `, cónyuges entre sí ${nupciasDesc}`;
    texto += `, ${natPlural}, mayores de edad`;
    texto += `, con cédulas de identidad número ${seller.ci_number || "___"} y ${seller2.ci_number || "___"} respectivamente`;
    texto += `, domiciliados en ${seller.address || "___"}, departamento de ${seller.department || "___"}`;
    if (tx.seller_has_representative) {
      texto += `, representados en este acto por ${tx.seller_representative_name || "___"}`;
      texto += `, con cédula de identidad número ${tx.seller_representative_ci || "___"}`;
      if (tx.seller_representative_address) texto += ` y domicilio en ${tx.seller_representative_address}`;
    }
    texto += ".";
    return { titulo: `1.PARTE VENDEDORA. – ${name}`, texto };
  }

  const name = String(seller.full_name || "___");
  let texto = `, ${toNationalitySingular(seller.nationality)}, mayor de edad`;
  texto += `, ${formatCivilStatusSimple(seller)}`;
  texto += `, titular de la cédula de identidad número ${seller.ci_number || "___"}`;
  texto += `, domiciliado en la calle ${seller.address || "___"}, departamento de ${seller.department || "___"}`;
  if (tx.seller_has_representative) {
    texto += `, representado en este acto por ${tx.seller_representative_name || "___"}`;
    texto += `, con cédula de identidad número ${tx.seller_representative_ci || "___"}`;
    if (tx.seller_representative_address) texto += ` y domicilio en ${tx.seller_representative_address}`;
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
    texto += `, con domicilio en ${buyer.address || "___"}, departamento de ${buyer.department || "___"}`;
    if (buyer.rut) texto += `, inscripta en el RUT de la DGI con el número ${buyer.rut}`;
    if (buyer.representative_name) {
      texto += `, representada en este acto por`;
      if (buyer.representative_role) texto += ` su ${buyer.representative_role}`;
      texto += ` ${buyer.representative_name}`;
      if (buyer.representative_ci) texto += `, con cédula de identidad número ${buyer.representative_ci}`;
      if (buyer.representative_address) texto += `, domiciliado en ${buyer.representative_address}`;
    }
    texto += ".";
    return { titulo: `2. PARTE COMPRADORA. – ${name}`, texto };
  }

  if (buyer2) {
    const name = `${buyer.full_name || "___"} y ${buyer2.full_name || "___"}`;
    const nup1 = buyer.nupcias_type as string;
    const nup2 = buyer2.nupcias_type as string;
    const nupciasDesc = (nup1 && nup2 && nup1 !== nup2)
      ? `en ${normalizeNupcias(nup1)} y ${normalizeNupcias(nup2)} nupcias respectivamente`
      : `en ${normalizeNupcias(nup1 || "unicas")} nupcias`;
    const natPlural = toNationalityPlural(buyer.nationality, buyer2.nationality);
    let texto = `, cónyuges entre sí ${nupciasDesc}`;
    texto += `, ${natPlural}, mayores de edad`;
    texto += `, con cédulas de identidad número ${buyer.ci_number || "___"} y ${buyer2.ci_number || "___"} respectivamente`;
    texto += `, domiciliados en ${buyer.address || "___"}, departamento de ${buyer.department || "___"}`;
    texto += ".";
    return { titulo: `2. PARTE COMPRADORA. – ${name}`, texto };
  }

  const name = String(buyer.full_name || "___");
  let texto = `, ${toNationalitySingular(buyer.nationality)}, mayor de edad`;
  texto += `, titular de la cedula de identidad número ${buyer.ci_number || "___"}`;
  texto += `, ${formatCivilStatusSimple(buyer)}`;
  texto += `, domiciliado en la calle ${buyer.address || "___"}, Departamento de ${buyer.department || "___"}`;
  if (tx.buyer_has_representative) {
    texto += `, representado en este acto por ${tx.buyer_representative_name || "___"}`;
    texto += `, con cédula de identidad número ${tx.buyer_representative_ci || "___"}`;
    if (tx.buyer_representative_address) texto += ` y domicilio en ${tx.buyer_representative_address}`;
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
  const amount = formatAmount(tx.price_amount);
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
      pago = `, pagaderos en ${tx.payment_installments_count || "___"} cuotas de ${symbol} ${formatAmount(tx.payment_installment_amount)} cada una. ${tx.payment_detail || ""}`;
      break;
    case "mixto":
      pago = `, parte al contado (${symbol} ${formatAmount(tx.payment_cash_amount)}) y ${tx.payment_detail || "saldo en cuotas"}, suma por la cual se otorga total carta de pago.`;
      break;
    case "letra_cambio":
      pago = `, que se abonan mediante letra de cambio${tx.payment_bank_name ? ` emitida por ${tx.payment_bank_name}` : ""}${tx.payment_detail ? `. ${tx.payment_detail}` : "."}`;
      break;
    case "cesion_tercero":
      pago = `, que se abonan mediante cesión a favor de tercero${tx.payment_third_party_name ? ` (${tx.payment_third_party_name})` : ""}${tx.payment_detail ? `. ${tx.payment_detail}` : "."}.`;
      break;
    default:
      pago = `, que fueron abonados antes de este acto, suma por la cual la parte vendedora otorga total carta de pago.`;
  }
  return { moneda, monto, pago };
}

function buildDeclaracionBps(bpsStatus: unknown, iraeStatus: unknown, imebaStatus: unknown): string {
  const isBps = bpsStatus === "si";
  const isIrae = iraeStatus === "si";
  const isImeba = imebaStatus === "si";
  if (!isBps && !isIrae && !isImeba) {
    return "NO ser contribuyente de BPS, IRAE, ni de IMEBA.-";
  }
  const parts: string[] = [];
  parts.push(isBps ? "SI ser contribuyente de BPS" : "NO ser contribuyente de BPS");
  parts.push(isIrae ? "SI ser contribuyente de IRAE" : "NO ser contribuyente de IRAE");
  parts.push(isImeba ? "SI ser contribuyente de IMEBA" : "NO ser contribuyente de IMEBA");
  return parts.join("; ") + ".-";
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
  } else if (tx.buyer_has_representative) {
    signers.push(String(tx.buyer_representative_name || "___"));
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

  const nombres = names.join(" y ") + ", ";

  let cedulas_texto: string;
  if (cis.length > 1) {
    cedulas_texto = `titulares de la cedula de identidad número ${cis.join(" y ")} respectivamente`;
  } else {
    cedulas_texto = `titular de la cédula de identidad número ${cis[0]}`;
  }
  cedulas_texto += `, cuyos demás datos surgen del documento que antecede, a quienes leí y así lo otorgaron.`;

  let secciones = "";
  let secNum = 2; // Section I is the firmas block, built outside this function

  // II) Title chain or first registration
  if (tx.previous_title_is_first_registration) {
    secciones += ` ${toRoman(secNum++)}) La parte vendedora es titular municipal, siendo esta la primera inscripción registral.`;
  } else if (tx.previous_owner_name || tx.previous_title_date) {
    // Describe seller civil state for this section
    let sellerState: string;
    if (seller2) {
      const nup1 = seller.nupcias_type as string;
      const nup2 = seller2.nupcias_type as string;
      sellerState = (nup1 && nup2 && nup1 !== nup2)
        ? `casados entre sí en ${normalizeNupcias(nup1)} y ${normalizeNupcias(nup2)} nupcias respectivamente`
        : `casados entre sí en ${normalizeNupcias(nup1 || "unicas")} nupcias`;
    } else {
      sellerState = formatCivilStatusSimple(seller);
    }

    // Build title description based on document type
    const titleType = tx.previous_title_type as string;
    let titleDesc: string;
    if (titleType === "escritura_publica") {
      titleDesc = `según escritura pública, autorizada por el Escribano ${tx.previous_title_notary || "___"} el ${formatDateShort(tx.previous_title_date as string | null)}, cuya primera copia fue inscripto en el Registro Mobiliario de ${tx.previous_title_registry || "___"} con el número ${tx.previous_title_number || "___"} el ${formatDateShort(tx.previous_title_registry_date as string | null)}.`;
    } else if (titleType === "sucesion") {
      titleDesc = `por adjudicación en hijuela, según escritura pública de partición, autorizada por el Escribano ${tx.previous_title_notary || "___"}, cuya primera copia fue inscripto en el Registro Mobiliario de ${tx.previous_title_registry || "___"} con el número ${tx.previous_title_number || "___"} el ${formatDateShort(tx.previous_title_registry_date as string | null)}.`;
    } else {
      // documento_privado (default)
      const notaryRef = tx.previous_title_same_notary
        ? "certificado y protocolizado en la misma fecha por quien suscribe"
        : `certificado y protocolizado por el Escribano ${tx.previous_title_notary || "___"} en la misma fecha`;
      titleDesc = `según documento privado de fecha ${formatDateShort(tx.previous_title_date as string | null)}, ${notaryRef}, e inscripto en el Registro Mobiliario de ${tx.previous_title_registry || "___"} con el número ${tx.previous_title_number || "___"} el ${formatDateShort(tx.previous_title_registry_date as string | null)}.`;
    }

    secciones += ` ${toRoman(secNum++)}) La parte vendedora siendo ${sellerState}, hubo el bien que se enajena de ${tx.previous_owner_name || "___"}, ${titleDesc}`;
  }

  // III) Power of attorney
  if (tx.seller_has_representative) {
    const powerTypeMap: Record<string, string> = {
      poder_especial: "poder especial",
      carta_poder: "carta poder",
      submandato: "submandato",
    };
    const powerLabel = powerTypeMap[tx.seller_representative_power_type as string] || "poder";
    const repName = String(tx.seller_representative_name || "___");
    const representedName = seller.is_company ? String(seller.company_name || "___") : String(seller.full_name || "___");
    secciones += ` ${toRoman(secNum++)}) El señor ${repName}, lo hace en representación de ${representedName}`;
    secciones += ` según ${powerLabel} de fecha ${formatDateShort(tx.seller_representative_power_date as string | null)}`;
    const protDate = tx.seller_representative_power_protocol_date as string | null;
    const certDate = tx.seller_representative_power_date as string | null;
    if (protDate && protDate !== certDate) {
      secciones += ` certificado en la misma fecha y protocolizado el ${formatDateShort(protDate)}`;
    } else {
      secciones += ` certificado y protocolizado por el Escribano ${tx.seller_representative_power_notary || "___"} en la misma fecha`;
    }
    secciones += `, con facultades para este acto y vigente a la fecha.`;
  }

  // Insurance — only when not handled as a separate certificate
  if (tx.insurance_policy_number && !tx.insurance_separate_cert) {
    secciones += ` ${toRoman(secNum++)}) Tuve a la vista Certificado de Seguro Obligatorio póliza número ${tx.insurance_policy_number}`;
    secciones += ` expedido por ${tx.insurance_company || "___"}`;
    secciones += ` y vencimiento el ${formatDateShort(tx.insurance_expiry as string | null)}`;
    secciones += `, dando cumplimento a la ley 18412.`;
  }

  // BPS / CUD certificates (when contributor)
  if (tx.bps_status === "si" && tx.bps_cert_number) {
    secciones += ` ${toRoman(secNum++)}) Tuve a la vista el Certificado Común número ${tx.bps_cert_number} expedido por el Banco de Previsión Social el ${formatDateShort(tx.bps_cert_date as string | null)}.`;
    if (tx.cud_number) {
      secciones += ` Certificado Único Departamental (CUD) ${tx.cud_number} expedido el ${formatDateShort(tx.cud_date as string | null)}.`;
    }
  }

  // Plate history
  if (tx.has_plate_history && tx.plate_history_entries) {
    const entries: Array<{ department: string; padron: string; matricula: string; date?: string }> = (() => {
      try {
        const parsed = JSON.parse(tx.plate_history_entries as string);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })();
    if (entries.length > 0) {
      secciones += ` ${toRoman(secNum++)}) ${buildPlateHistoryText(entries)}`;
    }
  }

  // CUD no-control declaration (when not a contributor)
  if (tx.bps_status !== "si" && tx.irae_status !== "si") {
    secciones += ` ${toRoman(secNum++)}) No se controla el Certificado Único Departamental en virtud de lo declarado por la parte vendedora, declaro no corresponder los impuestos de Irae e Imeba por no estar comprendido en la ley 17930 y su decreto reglamentario.`;
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
  const cuotaParte = "1/1";
  const vendedora = buildParteVendedora(seller, seller2, tx);
  const compradora = buildParteCompradora(buyer, buyer2, tx);
  const precio = buildPrecio(tx as unknown as Record<string, unknown>);
  const certQ = buildCertificoQue(seller, seller2, buyer, tx as unknown as Record<string, unknown>);
  const initials = String(prof.notary_initials || "F.C.A.");
  const notaryName = String(prof.notary_name || prof.full_name || "Franco Castiglioni Abelenda");
  const resolvedFolioEnd = tx.folio_end || (tx.folio_start ? (tx.folio_start as number) + 1 : "___");
  const folioEndText = String(resolvedFolioEnd || "___");
  const folioEndDisplay = tx.folio_end_is_vuelto === false ? folioEndText : `${folioEndText} vuelto`;

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

    // Declaración de domicilio especial
    election_declaration: tx.election_declaration || "",

    // Cláusula 5 - Precio (moneda=normal, monto=bold, pago=normal)
    precio_moneda: precio.moneda,
    precio_monto: precio.monto,
    precio_pago: precio.pago,

    // Cláusula 9 - Declaraciones
    declaracion_bps: buildDeclaracionBps(tx.bps_status, tx.irae_status, tx.imeba_status),

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
    folio_end: folioEndText,
    folio_end_display: folioEndDisplay,

    // Paper
    paper_series_proto: tx.paper_series_proto || prof.paper_series_proto || "___",
    paper_number_proto: tx.paper_number_proto || prof.paper_number_proto || "___",
    paper_series_testimony: tx.paper_series_testimony || prof.paper_series_testimony || "___",
    paper_numbers_testimony: tx.paper_numbers_testimony || prof.paper_numbers_testimony || "___",

    // Insurance (conditional via {#has_insurance} in template)
    has_insurance: !!tx.insurance_policy_number,
    insurance_policy: tx.insurance_policy_number || "___",
    insurance_company: tx.insurance_company || "___",
    insurance_expiry: formatDateShort(tx.insurance_expiry as string | null),

    // Plate history (conditional via {#has_plate_history} in template)
    has_plate_history: !!tx.has_plate_history,
    plate_history_entries: (() => {
      if (!tx.plate_history_entries) return [];
      try {
        const parsed = JSON.parse(tx.plate_history_entries as string);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })(),
  };

  doc.render(data);

  // Post-process: collapse trailing empty paragraphs before sectPr that cause blank pages.
  // These come from template spacing around conditional blocks (e.g. {#has_insurance}) that
  // are removed when the condition is false, leaving orphan empty paragraphs with heavy spacing.
  const zipObj = doc.getZip();
  const rawXml = zipObj.files["word/document.xml"].asText();
  let fixedXml = rawXml.replace(
    /((?:<w:p\b(?:(?!<w:t[ >])[\s\S])*?<\/w:p>\s*){2,})(<w:sectPr)/,
    (_m, _block, sectPr) =>
      `<w:p><w:pPr><w:spacing w:line="240" w:lineRule="atLeast"/></w:pPr></w:p>\n${sectPr}`
  );
  if (tx.folio_end_is_vuelto === false && folioEndText !== "___") {
    fixedXml = fixedXml.replace(
      new RegExp(`(a ${folioEndText}) vuelto(\.)`, "g"),
      "$1$2"
    );
  }
  if (fixedXml !== rawXml) zipObj.file("word/document.xml", fixedXml);

  const buf = zipObj.generate({
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
