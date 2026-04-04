import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

const PERSON_PROMPT = `Sos un asistente de un escribano uruguayo. Analizá esta imagen de una cédula de identidad uruguaya y extraé los siguientes datos en formato JSON estricto. Si un campo no es visible o legible, usá null.

Formato esperado:
{
  "full_name": "NOMBRE COMPLETO",
  "ci_number": "1.234.567-8",
  "nationality": "uruguaya",
  "birth_date": "YYYY-MM-DD",
  "birth_place": "Ciudad, Departamento",
  "civil_status": null,
  "address": null,
  "department": null
}

Devolvé SOLO el JSON, sin texto adicional ni backticks.`;

const VEHICLE_PROMPT = `Sos un asistente de un escribano uruguayo. Analizá esta imagen de una libreta de propiedad de vehículo uruguaya y extraé los siguientes datos en formato JSON estricto. Si un campo no es visible o legible, usá null.

Formato esperado:
{
  "brand": "MARCA",
  "model": "MODELO",
  "year": 2020,
  "type": "TIPO (auto, camioneta, etc.)",
  "fuel": "nafta",
  "cylinders": 1600,
  "motor_number": "NUMERO_MOTOR",
  "chassis_number": "NUMERO_CHASIS",
  "plate": "ABC1234",
  "padron": "123456",
  "padron_department": "Montevideo",
  "national_code": "12345",
  "affectation": "particular",
  "owner_name": "NOMBRE DEL TITULAR",
  "owner_ci": "1.234.567-8"
}

Devolvé SOLO el JSON, sin texto adicional ni backticks.`;

const TEXT_PROMPT = `Sos un asistente de un escribano uruguayo. Del siguiente texto (posiblemente un mensaje de WhatsApp con datos de una operación), extraé toda la información que puedas identificar como datos de personas o vehículos. Devolvé un JSON con la estructura:

{
  "persons": [
    {
      "role": "vendedor" | "comprador" | "desconocido",
      "full_name": "...",
      "ci_number": "...",
      "nationality": "...",
      "birth_date": "YYYY-MM-DD",
      "birth_place": "...",
      "civil_status": "soltero|casado|divorciado|viudo",
      "address": "...",
      "department": "...",
      "phone": "..."
    }
  ],
  "vehicles": [
    {
      "brand": "...",
      "model": "...",
      "year": 2020,
      "plate": "...",
      "padron": "...",
      "motor_number": "...",
      "chassis_number": "..."
    }
  ],
  "price": {
    "amount": 5000,
    "currency": "USD",
    "in_words": "..."
  }
}

Si algún dato no aparece en el texto, omitilo o usá null. Devolvé SOLO el JSON, sin texto adicional ni backticks.

Texto:
`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const formData = await request.formData();
  const type = formData.get("type") as string; // "cedula" | "libreta" | "text"
  const fileId = formData.get("fileId") as string | null;

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  let result;

  if (type === "text") {
    const text = formData.get("text") as string;
    if (!text) {
      return NextResponse.json(
        { error: "Texto requerido" },
        { status: 400 }
      );
    }
    const response = await model.generateContent(TEXT_PROMPT + text);
    result = response.response.text();
  } else {
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "Archivo requerido" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const prompt =
      type === "cedula" ? PERSON_PROMPT : VEHICLE_PROMPT;

    const response = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: file.type,
          data: base64,
        },
      },
    ]);
    result = response.response.text();
  }

  // Parse JSON from response
  let parsed;
  try {
    // Remove potential markdown code blocks
    const cleaned = result
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { error: "Error al parsear respuesta de IA", raw: result },
      { status: 500 }
    );
  }

  // Save extracted data to file record if fileId provided
  if (fileId) {
    await supabase
      .from("files")
      .update({ extracted_data: parsed })
      .eq("id", fileId)
      .eq("user_id", user.id);
  }

  return NextResponse.json({ data: parsed, type });
}
