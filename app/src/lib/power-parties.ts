import type { ExtractedCartaPoderData, ExtractedPowerPartyData } from "@/lib/types";

export interface PowerCandidate {
  id: string;
  label: string;
  full_name?: string;
  ci_number?: string;
  rut?: string;
  address?: string;
  kind: "person" | "company";
}

const IDENTIFIER_REGEX = /(\d{12}|\d{1,2}\.??\d{3}\.??\d{3}-?\d)/g;
const NAME_SEPARATOR_REGEX = /[,;\n\r]+/;

function splitNames(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(NAME_SEPARATOR_REGEX)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitIdentifiers(party: ExtractedPowerPartyData): Array<{ value: string; kind: "person" | "company" }> {
  const rawValues = [party.rut, party.ci_number]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(", ");

  const matches = Array.from(rawValues.matchAll(IDENTIFIER_REGEX)).map((match) => match[0]);
  if (matches.length > 0) {
    return matches.map((value) => ({
      value,
      kind: value.replace(/\D/g, "").length === 12 ? "company" : "person",
    }));
  }

  return rawValues
    .split(NAME_SEPARATOR_REGEX)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => ({
      value,
      kind: value.replace(/\D/g, "").length === 12 ? "company" : "person",
    }));
}

export function normalizePowerKind(party: ExtractedPowerPartyData): "person" | "company" {
  if (party.kind === "company") return "company";
  if (party.kind === "person") return "person";
  return party.rut && !party.ci_number ? "company" : "person";
}

export function getPowerPartyIdentifier(party: ExtractedPowerPartyData): string | undefined {
  const kind = normalizePowerKind(party);
  const identifier = kind === "company" ? party.rut : party.ci_number;
  return identifier?.trim() || undefined;
}

function normalizeSinglePowerParty(party: ExtractedPowerPartyData): ExtractedPowerPartyData {
  const kind = normalizePowerKind(party);
  const fullName = party.full_name?.trim();
  const ciNumber = party.ci_number?.trim();
  const rut = party.rut?.trim();

  return {
    ...party,
    full_name: fullName || undefined,
    kind,
    ci_number: kind === "person" ? ciNumber || undefined : undefined,
    rut: kind === "company" ? rut || undefined : undefined,
    address: party.address?.trim() || undefined,
    role: party.role?.trim() || undefined,
  };
}

export function normalizePowerPartyList(
  parties: ExtractedPowerPartyData[] | undefined,
  fallbackRole: "poderdante" | "apoderado"
): ExtractedPowerPartyData[] {
  if (!Array.isArray(parties) || parties.length === 0) return [];

  return parties.flatMap((party) => {
    if (!party) return [];

    const names = splitNames(party.full_name);
    const identifiers = splitIdentifiers(party);
    const candidateCount = Math.max(names.length, identifiers.length);

    if (candidateCount <= 1) {
      return [{
        ...normalizeSinglePowerParty(party),
        role: party.role?.trim() || fallbackRole,
      }];
    }

    return Array.from({ length: candidateCount }, (_, index) => {
      const identifier = identifiers[index];
      const kind = identifier?.kind ?? normalizePowerKind(party);
      const fullName = names[index]?.trim();

      const normalizedParty: ExtractedPowerPartyData = {
        full_name: fullName || undefined,
        kind,
        address: party.address?.trim() || undefined,
        gender: party.gender ?? null,
        role: party.role?.trim() || fallbackRole,
      };

      if (kind === "company") {
        normalizedParty.rut = identifier?.value?.trim() || undefined;
      } else {
        normalizedParty.ci_number = identifier?.value?.trim() || undefined;
      }

      return normalizedParty;
    }).filter((candidate) => candidate.full_name || candidate.ci_number || candidate.rut);
  });
}

export function normalizeExtractedCartaPoderData(data: ExtractedCartaPoderData): ExtractedCartaPoderData {
  const poderdantesSource = Array.isArray(data.poderdantes)
    ? data.poderdantes
    : data.poderdante
      ? [data.poderdante]
      : [];
  const apoderadosSource = Array.isArray(data.apoderados)
    ? data.apoderados
    : data.apoderado
      ? [data.apoderado]
      : [];

  const poderdantes = normalizePowerPartyList(poderdantesSource, "poderdante");
  const apoderados = normalizePowerPartyList(apoderadosSource, "apoderado");

  return {
    ...data,
    poderdante: poderdantes[0],
    apoderado: apoderados[0],
    poderdantes,
    apoderados,
  };
}

export function buildPowerCandidates(data: Record<string, unknown>): PowerCandidate[] {
  const cartaPoder = normalizeExtractedCartaPoderData(data as ExtractedCartaPoderData);

  return cartaPoder.apoderados?.reduce<PowerCandidate[]>((candidates, party, index) => {
    if (!party) return candidates;

    const kind = normalizePowerKind(party);
    const identifier = getPowerPartyIdentifier(party);
    const fullName = party.full_name?.trim();
    if (!fullName && !identifier) return candidates;

    candidates.push({
      id: `${kind}:${identifier ?? fullName ?? index}`,
      label: identifier ? `${fullName ?? "Sin nombre"} - ${identifier}` : fullName ?? "Sin nombre",
      full_name: fullName,
      ci_number: party.ci_number?.trim(),
      rut: party.rut?.trim(),
      address: party.address?.trim(),
      kind,
    });

    return candidates;
  }, []) ?? [];
}

export function getPowerGrantors(data: Record<string, unknown>): ExtractedPowerPartyData[] {
  return normalizeExtractedCartaPoderData(data as ExtractedCartaPoderData).poderdantes ?? [];
}