import { describe, expect, it } from "vitest";

import { normalizeNationalityFields, normalizeNationalityValue } from "./nationality";

describe("normalizeNationalityValue", () => {
  it("convierte variantes uruguayas a oriental", () => {
    expect(normalizeNationalityValue("URUGUAYA")).toBe("oriental");
    expect(normalizeNationalityValue("uruguayo")).toBe("oriental");
    expect(normalizeNationalityValue("orientales")).toBe("oriental");
  });

  it("normaliza otras nacionalidades en minúscula", () => {
    expect(normalizeNationalityValue("ARGENTINA")).toBe("argentina");
  });

  it("usa oriental como fallback", () => {
    expect(normalizeNationalityValue("")).toBe("oriental");
  });
});

describe("normalizeNationalityFields", () => {
  it("normaliza sólo las claves indicadas", () => {
    expect(
      normalizeNationalityFields(
        {
          seller_nationality: "URUGUAYA",
          buyer_nationality: "ARGENTINA",
          other: "Se mantiene igual",
        },
        ["seller_nationality", "buyer_nationality"]
      )
    ).toEqual({
      seller_nationality: "oriental",
      buyer_nationality: "argentina",
      other: "Se mantiene igual",
    });
  });
});