import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AnalysisRequest = {
  sessionId: string;
  photoId: string;
  imageDataUrl: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as AnalysisRequest;
  const { sessionId, photoId, imageDataUrl } = body;

  if (!sessionId || !photoId || !imageDataUrl) {
    return NextResponse.json(
      { error: "Parametres manquants." },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash";

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY manquante dans les variables d'environnement. Veuillez configurer une clé API valide sur https://openrouter.ai/keys" },
      { status: 500 }
    );
  }

  const prompt = `Réalise une analyse esthétique GLOBALE et COMPLÈTE du visage.

CONTEXTE:
Tu analyses l'ensemble du visage dans sa globalité. Cette analyse doit être holistique et prendre en compte tous les aspects esthétiques visibles.

INSTRUCTIONS:
1. Observe le visage dans son ensemble: proportions, symétrie, harmonie générale
2. Évalue la qualité de peau globale: texture, teint, uniformité, luminosité
3. Analyse les principales zones anatomiques: front, région péri-orbitaire, zone médio-faciale (pommettes, nez), zone inférieure (bouche, menton, mandibule)
4. Note les signes de vieillissement globaux: rides, relâchement, perte de volume
5. Identifie les points forts esthétiques du visage
6. Sois professionnel et utilise une terminologie esthétique appropriée
7. IMPORTANT: Ne pose JAMAIS de diagnostic médical - reste dans l'observation esthétique

STRUCTURE DE RÉPONSE:
Fournis une analyse structurée et détaillée en plusieurs sections.

Réponds UNIQUEMENT en JSON strict avec cette structure:
{
  "summary": "Vue d'ensemble du visage en 2-3 phrases décrivant l'impression générale et les caractéristiques principales",
  "globalObservations": [
    "Observation globale 1 (proportions, symétrie, harmonie)",
    "Observation globale 2 (qualité de peau générale)",
    "Observation globale 3 (tonus et fermeté globale)",
    ...
  ],
  "regionalAnalysis": {
    "upperFace": "Analyse de la région supérieure (front, tempes, région péri-orbitaire)",
    "midFace": "Analyse de la région médiane (pommettes, nez, sillons naso-labiaux)",
    "lowerFace": "Analyse de la région inférieure (bouche, menton, mandibule, ovale du visage)"
  },
  "agingConcerns": [
    "Signe de vieillissement 1",
    "Signe de vieillissement 2",
    ...
  ],
  "strengths": [
    "Point fort esthétique 1",
    "Point fort esthétique 2",
    ...
  ],
  "globalRecommendations": [
    "Recommandation de soin globale 1",
    "Recommandation de soin globale 2",
    ...
  ],
  "disclaimer": "Ces observations sont à visée esthétique uniquement et ne constituent pas un diagnostic médical."
}`;

  const payload = {
    model,
    temperature: 0.3,
    max_tokens: 2000,
    messages: [
      {
        role: "system",
        content: `Tu es un expert en analyse esthétique faciale avec une connaissance approfondie de l'anatomie du visage.
Tu réalises des analyses globales et holistiques du visage, en prenant en compte l'harmonie générale, les proportions, la qualité de peau et les signes de vieillissement.
Tu fournis des observations professionnelles détaillées, JAMAIS de diagnostics médicaux.
Tu identifies aussi bien les préoccupations esthétiques que les points forts du visage.`,
      },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
  };

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: `OpenRouter error: ${errorText}` },
      { status: 502 }
    );
  }

  const data = await response.json();
  let content = data?.choices?.[0]?.message?.content ?? "";
  let parsed: Record<string, unknown> = {};

  if (typeof content === "string") {
    // Nettoyer le contenu : enlever les blocs markdown ```json...```
    content = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { summary: content, raw: content };
    }
  } else {
    parsed = { summary: "Reponse vide.", raw: "" };
  }

  // Sauvegarder l'analyse globale
  const supabase = await createSupabaseServerClient();
  const { data: inserted, error: insertError } = await supabase
    .from("global_face_analyses")
    .insert({
      session_id: sessionId,
      photo_id: photoId,
      result: parsed,
    })
    .select("id, result, created_at")
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: inserted });
}
