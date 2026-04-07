from pathlib import Path

from docx import Document


ROOT = Path(r"c:\Users\manue\source\repos\FrancoEscribano")
REFERENCE_DOCX = Path(r"c:\Users\manue\Downloads\Franco\compraventa ultima.docx")
OUTPUT_DOCX = ROOT / "app" / "templates" / "compraventa.docx"


def set_paragraph_text(paragraph, text: str) -> None:
    # Keep paragraph-level style/alignment and run-level visual format from first run.
    if paragraph.runs:
        first = paragraph.runs[0]
        for run in paragraph.runs[1:]:
            run.text = ""
        first.text = text
    else:
        paragraph.add_run(text)


def main() -> None:
    if not REFERENCE_DOCX.exists():
        raise FileNotFoundError(f"No existe referencia: {REFERENCE_DOCX}")

    doc = Document(str(REFERENCE_DOCX))

    # Replace core legal clauses with template tags while preserving visual style.
    replacements = {
        3: "En la ciudad de {ciudad}, el día {fecha_letras}, las partes que se expresan han convenido celebrar el siguiente contrato de compraventa:",
        4: "{clausula_vendedora}",
        5: "{clausula_compradora}",
        6: "3. BIEN QUE SE VENDE. - La parte vendedora vende a la parte compradora y ésta adquiere, libre de toda obligación, gravamen, multas, infracciones y demás responsabilidades civiles, tributarias y penales, el siguiente bien: (auto, camión, etc): AUTOMOTOR:",
        7: "4. DERECHO QUE SE TRASMITE. (CUOTA PARTE).- La parte vendedora trasmite a la parte compradora: LA PROPIEDAD del vehículo a que se refiere la cláusula 3, a saber las {cuota_parte} avas partes.-",
        8: "{precio_texto}",
        9: "{tradicion_texto}",
        10: "7. TÍTULO ANTERIOR. – Se controlará por certificación notarial.",
        11: "8. DOMICILIO.- Las partes fijan a los efectos de este contrato y de las actuaciones registrales que se cumplan en el Registro de Vehículos Automotores, los indicados como suyos respectivamente, en la comparecencia. -",
        12: "{declaracion_texto}",
        13: "{declaracion_responsabilidad_texto}",
        14: "{solicitud_intervencion_texto}",
        15: "{certifico_que}",
        16: "{protocolizacion_texto}",
        17: "{primer_testimonio}",
    }

    for index_1_based, text in replacements.items():
        set_paragraph_text(doc.paragraphs[index_1_based - 1], text)

    # Optional trailing insurance certificate block.
    if len(doc.paragraphs) >= 32:
        set_paragraph_text(doc.paragraphs[31], "{certificado_seguro_texto}")

    if not doc.tables:
        raise RuntimeError("La referencia no contiene tabla de datos del vehículo")

    table = doc.tables[0]
    table_values = [
        (0, 0, "TIPO: {vehicle_type}"),
        (0, 1, "MARCA: {vehicle_brand}"),
        (1, 0, "MODELO: {vehicle_model}"),
        (1, 1, "AÑO: {vehicle_year}"),
        (2, 0, "PADRON: {vehicle_padron} de {vehicle_padron_department}"),
        (2, 1, "MATRICULA: {vehicle_plate}"),
        (3, 0, "MOTOR: {vehicle_motor}"),
        (3, 1, "A (combustible): {vehicle_fuel}"),
        (4, 0, "CHASIS: {vehicle_chassis}"),
        (4, 1, "CILINDROS: {vehicle_cylinders}"),
    ]

    for row, col, value in table_values:
        table.cell(row, col).text = value

    OUTPUT_DOCX.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(OUTPUT_DOCX))
    print(f"Template actualizado: {OUTPUT_DOCX}")


if __name__ == "__main__":
    main()
