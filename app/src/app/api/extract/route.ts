import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

// Retry wrapper with exponential backoff for Gemini 429 errors
async function callGeminiWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const is429 = message.includes("429") || message.includes("Too Many Requests") || message.includes("quota");
      if (!is429 || attempt === maxRetries) throw err;

      // Parse retry delay from error or use exponential backoff
      const retryMatch = message.match(/retry\s*(?:in|after)\s*([\d.]+)s/i);
      const waitSec = retryMatch ? parseFloat(retryMatch[1]) : Math.pow(2, attempt + 1) * 5;
      const waitMs = Math.min(waitSec * 1000, 60000); // Cap at 60s
      console.log(`Gemini 429 — retry ${attempt + 1}/${maxRetries} in ${waitMs}ms`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw new Error("Max retries exceeded");
}

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

const CLASSIFY_PROMPT = `Analizá este documento y clasificalo en una de estas categorías:
- "cedula": es una cédula de identidad uruguaya (documento de identidad de una persona)
- "libreta": es una libreta de propiedad de un vehículo uruguayo (documento de registro vehicular)
- "otro": no es ninguno de los anteriores (por ejemplo: carta poder, antecedentes, u otro documento legal)

Respondé SOLO con una de estas tres palabras: cedula, libreta, otro. Sin puntuación ni texto adicional.`;

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
  let type = formData.get("type") as string; // "cedula" | "libreta" | "text" | "auto"
  const fileId = formData.get("fileId") as string | null;

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // Resolve MIME type from file extension when the blob type is missing or generic
  function resolveMimeType(file: File): string {
    if (file.type && file.type !== "application/octet-stream") return file.type;
    const ext = (file.name ?? "").split(".").pop()?.toLowerCase();
    const map: Record<string, string> = {
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
      gif: "image/gif", webp: "image/webp", bmp: "image/bmp",
      pdf: "application/pdf",
    };
    return map[ext ?? ""] ?? "application/octet-stream";
  }

  let result;

  try {
  if (type === "text") {
    const text = formData.get("text") as string;
    if (!text) {
      return NextResponse.json(
        { error: "Texto requerido" },
        { status: 400 }
      );
    }
    const response = await callGeminiWithRetry(() => model.generateContent(TEXT_PROMPT + text));
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
    const mimeType = resolveMimeType(file);
    const inlineData = { mimeType, data: base64 };

    // Auto-detect document type
    if (type === "auto") {
      // 1. Try filename heuristic first
      const name = (file.name ?? "").toLowerCase();
      if (name.includes("cedula") || name.includes("cédula") || name.includes("ci_") || name.includes("ci-")) {
        type = "cedula";
      } else if (name.includes("libreta") || name.includes("vehiculo") || name.includes("vehículo") || name.includes("padron") || name.includes("padrón")) {
        type = "libreta";
      } else {
        // 2. Ask Gemini to classify
        const classifyRes = await callGeminiWithRetry(() =>
          model.generateContent([CLASSIFY_PROMPT, { inlineData }])
        );
        const classification = classifyRes.response.text().trim().toLowerCase();
        if (classification === "cedula") {
          type = "cedula";
        } else if (classification === "libreta") {
          type = "libreta";
        } else {
          // Unknown type — return early so UI can ask user
          return NextResponse.json({ data: null, type: "unknown" });
        }
      }
    }

    const prompt =
      type === "cedula" ? PERSON_PROMPT : VEHICLE_PROMPT;

    const response = await callGeminiWithRetry(() =>
      model.generateContent([prompt, { inlineData }])
    );
    result = response.response.text();
  }
  } catch (aiError) {
    console.error("Gemini API error:", aiError);
    return NextResponse.json(
      { error: "Error al procesar con IA", details: aiError instanceof Error ? aiError.message : String(aiError) },
      { status: 502 }
    );
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
