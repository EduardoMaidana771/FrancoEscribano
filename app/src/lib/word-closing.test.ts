import { describe, expect, it } from "vitest";

import {
  buildSignatureLinesText,
  buildSignatureNarrative,
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
  it("elimina certifico/protocolización/testimonio y conserva la tabla final", () => {
    const xml = [
      "<w:p><w:r><w:t>10. SOLICITUD...</w:t></w:r></w:p>",
      "<w:p><w:r><w:t>CERTIFICO QUE: I) ...</w:t></w:r></w:p>",
      "<w:p><w:r><w:t>Nº 136 Protocolización...</w:t></w:r></w:p>",
      "<w:p><w:r><w:t>ES PRIMER TESTIMONIO...</w:t></w:r></w:p>",
      "<w:tbl><w:tr><w:tc><w:p><w:r><w:t>TIPO: CAMIONETA</w:t></w:r></w:p></w:tc></w:tr></w:tbl>",
    ].join("");

    const stripped = stripNotarialCertificationSections(xml);

    expect(stripped).not.toContain("CERTIFICO QUE");
    expect(stripped).not.toContain("Protocolización");
    expect(stripped).toContain("<w:tbl>");
  });
});