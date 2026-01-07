import { NextResponse } from "next/server";

type ChatRequest = {
  sessionId: string;
  photoId: string;
  message: string;
  mode?: "chat" | "treatment" | "nutrition";
  treatmentType?: string;
  imageUrl?: string;
  globalSummary?: string;
};

export const dynamic = "force-dynamic";

function buildPrompt(payload: ChatRequest) {
  const { mode, treatmentType, globalSummary } = payload;
  const base = `Tu es un assistant en medecine esthetique faciale. 
Tu donnes des informations professionnelles et pedagogiques, sans diagnostic medical.
Tu restes centre sur l'esthetique du visage, le vieillissement, la nutrition et les traitements esthetiques.
Tu adaptes tes reponses a la photo et au contexte fournis.`;

  const summary = globalSummary
    ? `Contexte clinique (resume): ${globalSummary}`
    : "";

  if (mode === "treatment") {
    return `${base}
${summary}
Objectif: proposer un traitement esthetique cible${treatmentType ? ` pour ${treatmentType}` : ""}.
Reponds STRICTEMENT en JSON:
{
  "reply": "Reponse courte pour le praticien",
  "treatmentText": "Texte detaille du traitement (benefices, limites, protocole, precautions)",
  "visualPrompt": "Prompt concis pour une image de simulation realiste, meme visage, amelioration subtile",
  "disclaimer": "Mention que cela reste un support de formulation"
}`;
  }

  if (mode === "nutrition") {
    return `${base}
${summary}
Objectif: donner des conseils nutritionnels et hygiene de vie qui peuvent impacter la qualite de peau et le vieillissement.
Reponds en JSON:
{
  "reply": "Conseils clairs et applicables",
  "disclaimer": "Mention que cela ne remplace pas un avis medical"
}`;
  }

  return `${base}
${summary}
Reponds en JSON:
{
  "reply": "Reponse claire et utile",
  "disclaimer": "Mention que cela ne remplace pas un avis medical"
}`;
}

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequest;
  const { sessionId, photoId, message, imageUrl, mode } = body;

  if (!sessionId || !photoId || !message) {
    return NextResponse.json(
      { error: "Parametres manquants." },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash";

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "OPENROUTER_API_KEY manquante. Configurez-la dans .env.local ou Netlify.",
      },
      { status: 500 }
    );
  }

  const prompt = buildPrompt(body);
  const content = [
    { type: "text", text: `${prompt}\n\nQuestion: ${message}` },
  ] as Array<{ type: "text" | "image_url"; text?: string; image_url?: { url: string } }>;

  if (imageUrl) {
    content.push({ type: "image_url", image_url: { url: imageUrl } });
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 1000,
      messages: [
        {
          role: "system",
          content:
            "Tu es un assistant en esthetique faciale. Reponds en JSON strict sans markdown.",
        },
        {
          role: "user",
          content,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: `OpenRouter error: ${errorText}` },
      { status: 502 }
    );
  }

  const data = await response.json();
  let contentText = data?.choices?.[0]?.message?.content ?? "";
  let parsed: Record<string, unknown> = {};

  if (typeof contentText === "string") {
    contentText = contentText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    try {
      parsed = JSON.parse(contentText);
    } catch {
      parsed = { reply: contentText };
    }
  } else {
    parsed = { reply: "Reponse vide." };
  }

  return NextResponse.json({ data: parsed, mode });
}
