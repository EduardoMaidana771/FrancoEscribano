import { describe, expect, it } from "vitest";

import {
  assignTextPersonsToParties,
  extractTextPersons,
  inferTextPartyRoleFromSourceName,
} from "./text-prefill";

describe("inferTextPartyRoleFromSourceName", () => {
  it("detecta comprador por el nombre del archivo", () => {
    expect(inferTextPartyRoleFromSourceName("Comprador.txt")).toBe("comprador");
  });

  it("detecta vendedor por el nombre del archivo", () => {
    expect(inferTextPartyRoleFromSourceName("datos_vendedora.docx")).toBe("vendedor");
  });
});

describe("extractTextPersons", () => {
  it("asigna rol inferido cuando hay una sola persona sin rol claro", () => {
    const persons = extractTextPersons(
      {
        persons: [
          {
            full_name: "Maria Fernanda Berrueta Maidana",
            ci_number: "4.426.052-5",
            role: "desconocido",
          },
        ],
      },
      { sourceName: "Comprador.txt" }
    );

    expect(persons).toHaveLength(1);
    expect(persons[0]?.role).toBe("comprador");
  });

  it("recupera payload plano heredado como persona usable", () => {
    const persons = extractTextPersons(
      {
        full_name: "Maria Fernanda Berrueta Maidana",
        ci_number: "4.426.052-5",
        nationality: "uruguaya",
      },
      { preferredSinglePersonRole: "comprador" }
    );

    expect(persons).toHaveLength(1);
    expect(persons[0]?.full_name).toBe("Maria Fernanda Berrueta Maidana");
    expect(persons[0]?.role).toBe("comprador");
  });
});

describe("assignTextPersonsToParties", () => {
  it("no asigna un comprador único al vendedor por fallback", () => {
    const parties = assignTextPersonsToParties([
      {
        full_name: "Maria Fernanda Berrueta Maidana",
        ci_number: "4.426.052-5",
        role: "comprador",
      },
    ]);

    expect(parties.seller).toBeNull();
    expect(parties.buyer?.full_name).toBe("Maria Fernanda Berrueta Maidana");
  });
});