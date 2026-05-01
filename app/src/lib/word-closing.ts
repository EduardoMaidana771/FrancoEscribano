const SIGNATURE_LINE = "………………………………";

export function buildSignatureNarrative(signers: string[]): string {
  if (signers.length === 0) return "";
  if (signers.length === 1) {
    return `Hay una firma de ${signers[0]}.`;
  }

  let result = `Hay una firma de ${signers[0]}`;
  for (let index = 1; index < signers.length; index += 1) {
    if (index === signers.length - 1) {
      result += ` y otra de ${signers[index]}`;
    } else {
      result += `, otra de ${signers[index]}`;
    }
  }
  return `${result}.`;
}

export function buildSignatureLinesText(signers: string[]): string {
  if (signers.length === 0) return "";

  const rows: string[] = [];
  for (let index = 0; index < signers.length; index += 2) {
    const left = signers[index] ?? "";
    const right = signers[index + 1] ?? "";
    const lineRow = right
      ? `${SIGNATURE_LINE}     ${SIGNATURE_LINE}`
      : SIGNATURE_LINE;
    const nameRow = right ? `${left}     ${right}` : left;
    rows.push(`${lineRow}\n${nameRow}`);
  }

  return `\n\n${rows.join("\n\n")}`;
}

export function stripNotarialCertificationSections(xml: string): string {
  return xml.replace(/<w:p\b[\s\S]*?CERTIFICO QUE:[\s\S]*?(?=<w:tbl\b)/, "");
}