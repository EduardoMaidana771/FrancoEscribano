import type { ExtractedTextData } from "@/lib/types";

export type TextPartyRole = "vendedor" | "comprador";

type ExtractedTextPerson = NonNullable<ExtractedTextData["persons"]>[number];

export interface AssignedTextPersons {
  seller: ExtractedTextPerson | null;
  buyer: ExtractedTextPerson | null;
  seller2: ExtractedTextPerson | null;
  buyer2: ExtractedTextPerson | null;
}

function isMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function normalizeRole(role: string | undefined): string {
  return (role ?? "").trim().toLowerCase();
}

function buildLegacyFlatTextPerson(data: Record<string, unknown>): ExtractedTextPerson | null {
  const relevantKeys = [
    "full_name",
    "ci_number",
    "nationality",
    "birth_date",
    "birth_place",
    "civil_status",
    "gender",
    "civil_status_detail",
    "nupcias_type",
    "spouse_name",
    "address",
    "department",
    "phone",
    "is_company",
    "company_name",
    "company_type",
    "rut",
    "role",
  ];

  if (!relevantKeys.some((key) => isMeaningfulValue(data[key]))) {
    return null;
  }

  const person: ExtractedTextPerson = {};

  for (const key of relevantKeys) {
    if (isMeaningfulValue(data[key])) {
      person[key as keyof ExtractedTextPerson] = data[key] as never;
    }
  }

  return person;
}

export function inferTextPartyRoleFromSourceName(
  sourceName?: string
): TextPartyRole | undefined {
  const normalized = (sourceName ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (!normalized) return undefined;
  if (/(comprador|compradora|buyer|adquirente)/.test(normalized)) {
    return "comprador";
  }
  if (/(vendedor|vendedora|seller|enajenante)/.test(normalized)) {
    return "vendedor";
  }
  return undefined;
}

export function extractTextPersons(
  data: Record<string, unknown>,
  options: {
    sourceName?: string;
    preferredSinglePersonRole?: TextPartyRole;
  } = {}
): ExtractedTextPerson[] {
  const extracted = data as ExtractedTextData & Record<string, unknown>;
  const persons = Array.isArray(extracted.persons)
    ? extracted.persons.map((person) => ({ ...person }))
    : [];

  if (persons.length === 0) {
    const legacyPerson = buildLegacyFlatTextPerson(extracted);
    if (legacyPerson) persons.push(legacyPerson);
  }

  if (persons.length === 1) {
    const currentRole = normalizeRole(persons[0].role);
    const inferredRole =
      options.preferredSinglePersonRole ??
      inferTextPartyRoleFromSourceName(options.sourceName);

    if ((!currentRole || currentRole === "desconocido") && inferredRole) {
      persons[0] = { ...persons[0], role: inferredRole };
    }
  }

  return persons;
}

export function assignTextPersonsToParties(
  persons: ExtractedTextPerson[]
): AssignedTextPersons {
  const remaining = [...persons];

  const takePerson = (role: string) => {
    const index = remaining.findIndex(
      (person) => normalizeRole(person.role) === normalizeRole(role)
    );
    if (index === -1) return null;
    const [person] = remaining.splice(index, 1);
    return person;
  };

  const seller = takePerson("vendedor");
  const buyer = takePerson("comprador");

  return {
    seller: seller ?? (buyer ? null : remaining.shift() ?? null),
    buyer: buyer ?? remaining.shift() ?? null,
    seller2: remaining.shift() ?? null,
    buyer2: remaining.shift() ?? null,
  };
}