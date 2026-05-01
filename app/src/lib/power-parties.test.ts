import { describe, expect, it } from "vitest";

import { buildPowerCandidates, normalizeExtractedCartaPoderData } from "./power-parties";

describe("normalizeExtractedCartaPoderData", () => {
  it("separa apoderados mezclados en un array de candidatos individuales", () => {
    const normalized = normalizeExtractedCartaPoderData({
      apoderados: [
        {
          full_name: "AUTOPRONTO SAS, Guillermo KEMPINSKI CASTRO, Fabiana KEMPINSKI CASTRO, Luis Paulo DE CRECENZIO BENÍTEZ, Enrique José LANDUCCI MOLINARI",
          ci_number: "4.709.144-2, 4.474.587-0, 2.574.154-0, 6.472.274-3",
          rut: "219864140014",
          role: "apoderado",
        },
      ],
    });

    expect(normalized.apoderados).toEqual([
      {
        full_name: "AUTOPRONTO SAS",
        rut: "219864140014",
        kind: "company",
        gender: null,
        role: "apoderado",
      },
      {
        full_name: "Guillermo KEMPINSKI CASTRO",
        ci_number: "4.709.144-2",
        kind: "person",
        gender: null,
        role: "apoderado",
      },
      {
        full_name: "Fabiana KEMPINSKI CASTRO",
        ci_number: "4.474.587-0",
        kind: "person",
        gender: null,
        role: "apoderado",
      },
      {
        full_name: "Luis Paulo DE CRECENZIO BENÍTEZ",
        ci_number: "2.574.154-0",
        kind: "person",
        gender: null,
        role: "apoderado",
      },
      {
        full_name: "Enrique José LANDUCCI MOLINARI",
        ci_number: "6.472.274-3",
        kind: "person",
        gender: null,
        role: "apoderado",
      },
    ]);
  });
});

describe("buildPowerCandidates", () => {
  it("genera opciones seleccionables desde los apoderados normalizados", () => {
    const candidates = buildPowerCandidates({
      apoderados: [
        {
          full_name: "AUTOPRONTO SAS, Guillermo KEMPINSKI CASTRO",
          ci_number: "4.709.144-2",
          rut: "219864140014",
          role: "apoderado",
        },
      ],
    });

    expect(candidates).toEqual([
      {
        id: "company:219864140014",
        label: "AUTOPRONTO SAS - 219864140014",
        full_name: "AUTOPRONTO SAS",
        rut: "219864140014",
        ci_number: undefined,
        address: undefined,
        kind: "company",
      },
      {
        id: "person:4.709.144-2",
        label: "Guillermo KEMPINSKI CASTRO - 4.709.144-2",
        full_name: "Guillermo KEMPINSKI CASTRO",
        ci_number: "4.709.144-2",
        rut: undefined,
        address: undefined,
        kind: "person",
      },
    ]);
  });
});