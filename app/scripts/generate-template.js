/**
 * Script to generate the compraventa.docx Docxtemplater template.
 * Run: node scripts/generate-template.js
 * Output: templates/compraventa.docx
 */

const PizZip = require("pizzip");
const fs = require("fs");
const path = require("path");

// Helper to create a paragraph with optional formatting
function p(text, opts = {}) {
  const { bold, size, align, caps, spacing } = opts;
  let rpr = "";
  if (bold) rpr += "<w:b/>";
  if (size) rpr += `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`;
  if (caps) rpr += "<w:caps/>";
  let ppr = "";
  if (align) ppr += `<w:jc w:val="${align}"/>`;
  if (spacing !== undefined) ppr += `<w:spacing w:after="${spacing}"/>`;

  // Handle text with line breaks (for multi-line paragraphs)
  const lines = text.split("\n");
  const runs = lines
    .map(
      (line, i) =>
        `<w:r><w:rPr>${rpr}</w:rPr><w:t xml:space="preserve">${escXml(line)}</w:t></w:r>${i < lines.length - 1 ? "<w:r><w:br/></w:r>" : ""}`
    )
    .join("");

  return `<w:p><w:pPr>${ppr}</w:pPr>${runs}</w:p>`;
}

function escXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Shorthand for a conditional block
function cond(tag, content) {
  return `${p(`{#${tag}}`)}${content}${p(`{/${tag}}`)}`;
}
function condInv(tag, content) {
  return `${p(`{^${tag}}`)}${content}${p(`{/${tag}}`)}`;
}

// Build the document body paragraphs
const body = [
  // ===== HEADER =====
  p("ESCRITURA NÚMERO {matriz_numero}", { bold: true, size: 28, align: "center" }),
  p("COMPRAVENTA DE VEHÍCULO AUTOMOTOR", { bold: true, size: 24, align: "center", spacing: 200 }),
  p(""),

  // ===== DATE & LOCATION =====
  p("En la ciudad de {ciudad}, el día {fecha}, ante mí, Escribano/a {escribano_nombre}, comparecen:", { size: 22 }),
  p(""),

  // ===== PARTE VENDEDORA =====
  p("PARTE VENDEDORA", { bold: true, size: 24, caps: true, spacing: 100 }),

  // Seller: Persona física
  p(`{^vendedor_es_empresa}`),
  p("Por una parte: {vendedor_nombre}, {vendedor_nacionalidad}, de estado civil {vendedor_estado_civil}, portador/a de la Cédula de Identidad N° {vendedor_ci}, con domicilio en {vendedor_domicilio}, departamento de {vendedor_departamento}.", { size: 22 }),
  p(`{/vendedor_es_empresa}`),

  // Seller: Empresa
  p(`{#vendedor_es_empresa}`),
  p("Por una parte: {vendedor_razon_social}, {vendedor_tipo_empresa}, R.U.T. N° {vendedor_rut}, inscripta en el Registro Nacional de Comercio bajo el N° {vendedor_registro_nro}, Folio {vendedor_registro_folio}, Libro {vendedor_registro_libro}, cuyo objeto social es {vendedor_objeto_social}, con domicilio en {vendedor_domicilio}, departamento de {vendedor_departamento}, representada en este acto por {vendedor_rep_nombre}, {vendedor_rep_cargo}, portador/a de la C.I. N° {vendedor_rep_ci}, con domicilio en {vendedor_rep_domicilio}.", { size: 22 }),
  p(`{#vendedor_ley_19484}`),
  p("Declara cumplir con las obligaciones de la Ley N° 19.484 de fecha 5 de enero de 2017.", { size: 22 }),
  p(`{/vendedor_ley_19484}`),
  p(`{/vendedor_es_empresa}`),

  // Seller representative (apoderado)
  p(`{#tiene_apoderado_vendedor}`),
  p("La parte vendedora actúa representada por {apoderado_vendedor_nombre}, portador/a de la C.I. N° {apoderado_vendedor_ci}, con domicilio en {apoderado_vendedor_domicilio}, en virtud de poder {apoderado_vendedor_poder_tipo} otorgado con fecha {apoderado_vendedor_poder_fecha}, ante el/la Escribano/a {apoderado_vendedor_escribano}, protocolizado con fecha {apoderado_vendedor_protocolo_fecha}.", { size: 22 }),
  p(`{#apoderado_vendedor_sustitucion}`),
  p("Con facultad de sustitución.", { size: 22 }),
  p(`{/apoderado_vendedor_sustitucion}`),
  p(`{/tiene_apoderado_vendedor}`),

  // Seller 2 (co-seller / spouse)
  p(`{#hay_vendedor2}`),
  p("Conjuntamente con: {vendedor2_nombre}, {vendedor2_nacionalidad}, de estado civil {vendedor2_estado_civil}, portador/a de la Cédula de Identidad N° {vendedor2_ci}, con domicilio en {vendedor2_domicilio}, departamento de {vendedor2_departamento}.", { size: 22 }),
  p(`{/hay_vendedor2}`),

  p(""),

  // ===== PARTE COMPRADORA =====
  p("PARTE COMPRADORA", { bold: true, size: 24, caps: true, spacing: 100 }),

  // Buyer: Persona física
  p(`{^comprador_es_empresa}`),
  p("Por otra parte: {comprador_nombre}, {comprador_nacionalidad}, de estado civil {comprador_estado_civil}, portador/a de la Cédula de Identidad N° {comprador_ci}, con domicilio en {comprador_domicilio}, departamento de {comprador_departamento}.", { size: 22 }),
  p(`{/comprador_es_empresa}`),

  // Buyer: Empresa
  p(`{#comprador_es_empresa}`),
  p("Por otra parte: {comprador_razon_social}, {comprador_tipo_empresa}, R.U.T. N° {comprador_rut}, inscripta en el Registro Nacional de Comercio bajo el N° {comprador_registro_nro}, Folio {comprador_registro_folio}, Libro {comprador_registro_libro}, cuyo objeto social es {comprador_objeto_social}, con domicilio en {comprador_domicilio}, departamento de {comprador_departamento}, representada en este acto por {comprador_rep_nombre}, {comprador_rep_cargo}, portador/a de la C.I. N° {comprador_rep_ci}, con domicilio en {comprador_rep_domicilio}.", { size: 22 }),
  p(`{#comprador_ley_19484}`),
  p("Declara cumplir con las obligaciones de la Ley N° 19.484 de fecha 5 de enero de 2017.", { size: 22 }),
  p(`{/comprador_ley_19484}`),
  p(`{/comprador_es_empresa}`),

  // Buyer representative (apoderado)
  p(`{#tiene_apoderado_comprador}`),
  p("La parte compradora actúa representada por {apoderado_comprador_nombre}, portador/a de la C.I. N° {apoderado_comprador_ci}, con domicilio en {apoderado_comprador_domicilio}, en virtud de poder {apoderado_comprador_poder_tipo} otorgado con fecha {apoderado_comprador_poder_fecha}, ante el/la Escribano/a {apoderado_comprador_escribano}, protocolizado con fecha {apoderado_comprador_protocolo_fecha}.", { size: 22 }),
  p(`{#apoderado_comprador_sustitucion}`),
  p("Con facultad de sustitución.", { size: 22 }),
  p(`{/apoderado_comprador_sustitucion}`),
  p(`{/tiene_apoderado_comprador}`),

  // Buyer 2 (co-buyer)
  p(`{#hay_comprador2}`),
  p("Conjuntamente con: {comprador2_nombre}, {comprador2_nacionalidad}, de estado civil {comprador2_estado_civil}, portador/a de la Cédula de Identidad N° {comprador2_ci}, con domicilio en {comprador2_domicilio}, departamento de {comprador2_departamento}.", { size: 22 }),
  p(`{/hay_comprador2}`),

  p(""),

  // ===== OBJETO =====
  p("OBJETO DE LA COMPRAVENTA", { bold: true, size: 24, caps: true, spacing: 100 }),

  p("Las partes convienen la compraventa del siguiente vehículo automotor:", { size: 22 }),
  p("Tipo: {vehiculo_tipo}", { size: 22 }),
  p("Marca: {vehiculo_marca}", { size: 22 }),
  p("Modelo: {vehiculo_modelo}", { size: 22 }),
  p("Año: {vehiculo_anio}", { size: 22 }),
  p("Combustible: {vehiculo_combustible}", { size: 22 }),
  p("Cilindrada: {vehiculo_cilindrada}", { size: 22 }),
  p("Motor N°: {vehiculo_motor}", { size: 22 }),
  p("Chasis N°: {vehiculo_chasis}", { size: 22 }),
  p("Matrícula: {vehiculo_matricula}", { size: 22 }),
  p("Padrón N°: {vehiculo_padron} del departamento de {vehiculo_padron_depto}", { size: 22 }),
  p("Código Nacional: {vehiculo_codigo_nacional}", { size: 22 }),
  p("Afectación: {vehiculo_afectacion}", { size: 22 }),
  p("Titular registral: {vehiculo_titular} (C.I. {vehiculo_titular_ci})", { size: 22 }),

  // Plate history
  p(`{#tiene_historial_matricula}`),
  p("Historial de matrículas: {historial_matricula}", { size: 22 }),
  p(`{/tiene_historial_matricula}`),

  p(""),

  // ===== ANTECEDENTE =====
  p("ANTECEDENTE DOMINIAL", { bold: true, size: 24, caps: true, spacing: 100 }),

  p(`{^anterior_primera_inscripcion}`),
  p("El vehículo fue adquirido por {anterior_propietario} mediante {anterior_tipo} de fecha {anterior_fecha}, otorgada ante el/la Escribano/a {anterior_escribano}, inscripta en el Registro de la Propiedad, Sección Mobiliaria de {anterior_registro} bajo el N° {anterior_numero}, con fecha {anterior_fecha_registro}.", { size: 22 }),
  p(`{/anterior_primera_inscripcion}`),

  p(`{#anterior_primera_inscripcion}`),
  p("Se trata de la primera inscripción de dominio del vehículo.", { size: 22 }),
  p(`{/anterior_primera_inscripcion}`),

  p(`{#anterior_mismo_escribano}`),
  p("Nota: el título anterior fue otorgado por la misma suscrita.", { size: 22 }),
  p(`{/anterior_mismo_escribano}`),

  p(""),

  // ===== PRECIO =====
  p("PRECIO Y FORMA DE PAGO", { bold: true, size: 24, caps: true, spacing: 100 }),

  p("El precio de la presente compraventa se fija en la suma de {precio_moneda_simbolo} {precio_monto} ({precio_letras} {precio_moneda}), que la parte compradora abona {forma_pago}.", { size: 22 }),

  p(""),

  // ===== DECLARACIONES FISCALES =====
  p("DECLARACIONES FISCALES", { bold: true, size: 24, caps: true, spacing: 100 }),

  p("La parte vendedora declara bajo juramento:", { size: 22 }),
  p("- BPS: {bps_texto}.", { size: 22 }),
  p(`{#es_contribuyente_bps}`),
  p("Certificado BPS N° {bps_cert_numero}, de fecha {bps_cert_fecha}.", { size: 22 }),
  p(`{/es_contribuyente_bps}`),
  p("- IRAE: {irae_texto}.", { size: 22 }),
  p("- IMEBA: {imeba_texto}.", { size: 22 }),

  // CUD
  p("CUD N° {cud_numero}, de fecha {cud_fecha}.", { size: 22 }),

  p(""),

  // ===== SEGURO =====
  p("SEGURO", { bold: true, size: 24, caps: true, spacing: 100 }),

  p("El vehículo se encuentra asegurado en {seguro_compania}, Póliza N° {seguro_poliza}, con vigencia hasta el {seguro_vigencia}.", { size: 22 }),
  p(`{#seguro_separado}`),
  p("Se agrega certificado de seguro por separado.", { size: 22 }),
  p(`{/seguro_separado}`),

  p(""),

  // ===== CLÁUSULAS ESPECIALES =====
  p(`{#tiene_clausula_transito}`),
  p("RESPONSABILIDAD POR TRÁNSITO", { bold: true, size: 24, caps: true, spacing: 100 }),
  p("La parte vendedora se hace responsable por las infracciones de tránsito y eventuales siniestros ocurridos con anterioridad a la fecha {fecha_responsabilidad_transito}. La parte compradora se hace responsable a partir de dicha fecha.", { size: 22 }),
  p(""),
  p(`{/tiene_clausula_transito}`),

  // Declaración de elección de domicilio
  p("DOMICILIO", { bold: true, size: 24, caps: true, spacing: 100 }),
  p(`{#declaracion_eleccion}`),
  p("{declaracion_eleccion}", { size: 22 }),
  p(`{/declaracion_eleccion}`),
  p(`{^declaracion_eleccion}`),
  p("Las partes constituyen domicilio especial en los indicados, donde se tendrán por válidas todas las notificaciones judiciales y extrajudiciales que se practiquen.", { size: 22 }),
  p(`{/declaracion_eleccion}`),

  p(""),

  // ===== PROTOCOLIZACIÓN =====
  p("PROTOCOLIZACIÓN", { bold: true, size: 24, caps: true, spacing: 100 }),

  p("Doy fe de conocer o identificar a los comparecientes. Se insertan los testimonios correspondientes.", { size: 22 }),
  p("Papel de protocolo: Serie {papel_serie_proto} N° {papel_numero_proto}", { size: 22 }),
  p("Papel de testimonios: Serie {papel_serie_testimonio} N° {papel_numeros_testimonio}", { size: 22 }),
  p("Matriz N° {matriz_numero}, Folio {folio_inicio} a {folio_fin}.", { size: 22 }),

  p(""),
  p(""),

  // ===== FIRMAS =====
  p("FIRMAS", { bold: true, size: 24, caps: true, align: "center", spacing: 100 }),
  p(""),
  p(""),
  p("_________________________________              _________________________________", { size: 22, align: "center" }),
  p("          Parte Vendedora                                          Parte Compradora", { size: 20, align: "center" }),
  p(""),
  p(""),
  p("_________________________________", { size: 22, align: "center" }),
  p("Escribano/a {escribano_nombre}", { size: 20, align: "center" }),
].join("");

// Build the minimal .docx structure
const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const wordRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:lang w:val="es-UY"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="60" w:line="276" w:lineRule="auto"/>
        <w:jc w:val="both"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>`;

const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
            xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
            xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
            xmlns:v="urn:schemas-microsoft-com:vml"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:w10="urn:schemas-microsoft-com:office:word"
            xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
            mc:Ignorable="w14 wp14">
  <w:body>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="18720" w:code="14"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
    ${body}
  </w:body>
</w:document>`;

// Create zip
const zip = new PizZip();
zip.file("[Content_Types].xml", contentTypes);
zip.folder("_rels").file(".rels", rels);
zip.folder("word").file("document.xml", document);
zip.folder("word").file("styles.xml", styles);
zip.folder("word").folder("_rels").file("document.xml.rels", wordRels);

const outDir = path.join(__dirname, "..", "templates");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const outPath = path.join(outDir, "compraventa.docx");
fs.writeFileSync(outPath, zip.generate({ type: "nodebuffer", compression: "DEFLATE" }));
console.log("Template generated:", outPath);
