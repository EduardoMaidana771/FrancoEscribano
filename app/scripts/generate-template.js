/**
 * Script to generate the compraventa.docx Docxtemplater template.
 * Matches the EXACT format used by Escribano Franco Castiglioni.
 * Run: node scripts/generate-template.js
 * Output: templates/compraventa.docx
 */

import PizZip from "pizzip";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

function escXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Build a Word paragraph. opts: bold, size, align, spacing
function p(text, opts = {}) {
  const { bold, size, align, spacing } = opts;
  let rpr = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>';
  if (bold) rpr += "<w:b/><w:bCs/>";
  if (size) rpr += `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`;
  let ppr = "";
  if (align) ppr += `<w:jc w:val="${align}"/>`;
  if (spacing !== undefined) ppr += `<w:spacing w:after="${spacing}"/>`;

  const lines = text.split("\n");
  const runs = lines
    .map(
      (line, i) =>
        `<w:r><w:rPr>${rpr}</w:rPr><w:t xml:space="preserve">${escXml(line)}</w:t></w:r>${i < lines.length - 1 ? "<w:r><w:br/></w:r>" : ""}`
    )
    .join("");

  return `<w:p><w:pPr>${ppr}</w:pPr>${runs}</w:p>`;
}

// ───────────────────────────────────────────────────────────
// DOCUMENT BODY — matches Escribano Franco's real format
// ───────────────────────────────────────────────────────────

const body = [
  // ===== TÍTULO =====
  p("COMPRAVENTA DE VEHICULO AUTOMOTOR", { bold: true, size: 24, align: "center", spacing: 120 }),

  // ===== INTRO =====
  p("Las partes que se expresan han convenido en celebrar el siguiente contrato de compraventa:", { size: 22 }),

  // ===== PARTE VENDEDORA =====
  p("{parte_vendedora}", { size: 22 }),

  // ===== PARTE COMPRADORA =====
  p("{parte_compradora}", { size: 22 }),

  // ===== BIEN QUE SE VENDE =====
  p("{bien_que_se_vende}", { size: 22 }),

  // ===== DERECHO QUE SE TRASMITE =====
  p("DERECHO QUE SE TRASMITE. La parte vendedora trasmite a la parte compradora la propiedad del vehículo a que se refiere la cláusula 3 a saber las cien avas partes.", { size: 22 }),

  // ===== PRECIO =====
  p("{precio_texto}", { size: 22 }),

  // ===== TRADICIÓN =====
  p("{tradicion_texto}", { size: 22 }),

  // ===== TÍTULO ANTERIOR =====
  p(" TITULO ANTERIOR.  Se controla por certificación notarial.", { size: 22 }),

  // ===== DOMICILIO =====
  p("DOMICILIO. Las partes fijan a los efectos de este contrato y de las actuaciones registrales que se cumplan en el Registro de Vehículos Automotores, los domicilios establecidos como suyos en la comparecencia.", { size: 22 }),

  // ===== DECLARACIÓN =====
  p("{declaracion_texto}", { size: 22 }),

  // ===== FECHA Y LUGAR DE OTORGAMIENTO =====
  p("FECHA Y LUGAR DE OTORGAMIENTO. Las partes otorgan y firman este contrato en {ciudad}, el {fecha_letras}.", { size: 22 }),

  // ===== SOLICITUD DE INTERVENCIÓN NOTARIAL =====
  p("SOLICITUD DE INTERVENCION NOTARIAL. Las partes solicitan al Escribano {escribano_nombre} con domicilio en {escribano_domicilio}, para que certifique el otorgamiento del presente contrato.", { size: 22 }),

  // ===== ERRORES DE TEXTO =====
  p("ERRORES DE TEXTO. –", { size: 22 }),
  p("", { spacing: 200 }),

  // ===== FIRMAS =====
  p("{firmas_vendedor}", { size: 22 }),
  p("{firmas_comprador}", { size: 22 }),
  p("", { spacing: 200 }),

  // ===== CERTIFICO QUE =====
  p("{certifico_que}", { size: 22 }),

  // ===== PROTOCOLIZACIÓN =====
  p("{protocolizacion_texto}", { size: 22 }),

  // ===== PRIMER TESTIMONIO =====
  p("{primer_testimonio}", { size: 22 }),
].join("");

// ───────────────────────────────────────────────────────────
// .docx ZIP structure
// ───────────────────────────────────────────────────────────

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
        <w:spacing w:after="40" w:line="264" w:lineRule="auto"/>
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
    ${body}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="18720" w:code="14"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1418" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

// Create zip
const zip = new PizZip();
zip.file("[Content_Types].xml", contentTypes);
zip.folder("_rels").file(".rels", rels);
zip.folder("word").file("document.xml", document);
zip.folder("word").file("styles.xml", styles);
zip.folder("word").folder("_rels").file("document.xml.rels", wordRels);

const outDir = join(import.meta.dirname, "..", "templates");
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

const outPath = join(outDir, "compraventa.docx");
writeFileSync(outPath, zip.generate({ type: "nodebuffer", compression: "DEFLATE" }));
console.log("Template generated:", outPath);
