import { describe, expect, it } from "vitest";

import {
  buildSignatureLinesText,
  buildSignatureNarrative,
  keepSignatureParagraphsTogether,
  stripNotarialCertificationSections,
} from "./word-closing";

describe("buildSignatureNarrative", () => {
  it("arma el texto narrativo tradicional", () => {
    expect(buildSignatureNarrative(["Guillermo Kempinski", "María Berrueta"])).toBe(
      "Hay una firma de Guillermo Kempinski y otra de María Berrueta."
    );
  });
});

describe("buildSignatureLinesText", () => {
  it("arma líneas para firmar cuando no hay certificación", () => {
    expect(buildSignatureLinesText(["Guillermo Kempinski", "María Berrueta"])).toContain(
      "Guillermo Kempinski     María Berrueta"
    );
  });
});

describe("stripNotarialCertificationSections", () => {
  it("elimina certifico/protocolización/testimonio hasta el cierre del documento", () => {
    const xml = [
      "<w:p><w:r><w:t>10. SOLICITUD...</w:t></w:r></w:p>",
      "<w:p><w:r><w:t>CERTIFICO QUE: I) ...</w:t></w:r></w:p>",
      "<w:p><w:r><w:t>Nº 136 Protocolización...</w:t></w:r></w:p>",
      "<w:p><w:r><w:t>ES PRIMER TESTIMONIO...</w:t></w:r></w:p>",
      "<w:sectPr><w:pgSz w:w=\"11906\" w:h=\"16838\"/></w:sectPr>",
    ].join("");

    const stripped = stripNotarialCertificationSections(xml);

    expect(stripped).not.toContain("CERTIFICO QUE");
    expect(stripped).not.toContain("Protocolización");
    expect(stripped).not.toContain("ES PRIMER TESTIMONIO");
    expect(stripped).toContain("<w:sectPr>");
  });
});

describe("keepSignatureParagraphsTogether", () => {
  it("marca el párrafo de firmas para que no se corte entre páginas", () => {
    const xml = [
      "<w:p>",
      "<w:r><w:t>………………………………</w:t></w:r>",
      '<w:r><w:br/></w:r>',
      "<w:r><w:t>Guillermo KEMPINSKI CASTRO     MARIA FERNANDA BERRUETA MAIDANA</w:t></w:r>",
      "</w:p>",
    ].join("");

    const updated = keepSignatureParagraphsTogether(xml);

    expect(updated).toContain("<w:keepLines/>");
  });
});