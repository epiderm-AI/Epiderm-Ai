import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AnalysisRequest = {
  sessionId: string;
  photoId: string;
  zoneId: string;
  imageDataUrl: string;
};

/**
 * Retourne le contexte anatomique et les caractéristiques d'une zone faciale
 * pour guider l'IA dans son analyse
 */
function getZoneContext(zoneName: string, zoneDescription: string): string {
  const zoneNameLower = zoneName.toLowerCase();

  // Contextes anatomiques par région
  const contexts: Record<string, string> = {
    frontal: `Zone frontale: Partie supérieure du visage, entre la ligne des cheveux et les sourcils.
Caractéristiques: Rides horizontales d'expression, tonus musculaire du frontalis, texture lisse ou marquée.
Points d'attention: Rides statiques vs dynamiques, relâchement cutané, hydratation.`,

    glabella: `Zone glabellaire: Région entre les sourcils, au-dessus de l'arête nasale.
Caractéristiques: Rides verticales et horizontales inter-sourcilières (rides du lion).
Points d'attention: Profondeur des rides, tension musculaire, pigmentation.`,

    temporal: `Zone temporale: Région latérale du front, au niveau des tempes.
Caractéristiques: Peau fine, vascularisation visible, légère dépression avec l'âge.
Points d'attention: Volume tissulaire, qualité de peau, visibilité vasculaire.`,

    peri_orbital: `Zone péri-orbitaire: Contour de l'œil (paupière supérieure/inférieure, région périoculaire).
Caractéristiques: Peau très fine, sensible, sujette aux cernes et poches.
Points d'attention: Cernes (pigmentaires/vasculaires/creux), poches, rides de la patte d'oie, tonus palpébral.`,

    nasal: `Zone nasale: Nez et arête nasale.
Caractéristiques: Peau plus épaisse, pores plus visibles, production sébacée variable.
Points d'attention: Texture, pores, sébum, teint, symétrie.`,

    malar: `Zone malaire: Pommettes et région sous-orbitaire.
Caractéristiques: Volume osseux et tissulaire, tonus cutané, élasticité.
Points d'attention: Projection des pommettes, rides nasogéniennes naissantes, tonus.`,

    nasolabial: `Sillon naso-labial: Pli allant de l'aile du nez au coin de la bouche.
Caractéristiques: Rides d'expression, profondeur variable selon l'âge et la mimique.
Points d'attention: Profondeur du sillon, statique vs dynamique, tonus périphérique.`,

    perioral: `Zone péri-orale: Contour des lèvres et région péribuccale.
Caractéristiques: Rides radiées péribuccales ("code-barres"), tonus orbiculaire.
Points d'attention: Rides verticales, volume labial, ourlet des lèvres, pigmentation.`,

    lip: `Zone labiale: Lèvres supérieure et inférieure.
Caractéristiques: Muqueuse semi-transparente, volume, hydratation, pigmentation.
Points d'attention: Deshydratation, volume, symétrie, ourlet net ou flou.`,

    marionette: `Sillon d'amertume (marionnette): Pli allant du coin de la bouche vers le menton.
Caractéristiques: Affaissement tissulaire, ptose du tiers inférieur.
Points d'attention: Profondeur, relâchement cutané adjacent, tonus.`,

    chin: `Zone mentonnière: Menton et région sous-labiale.
Caractéristiques: Relief osseux, capitons mentonniers, tonus musculaire.
Points d'attention: Capitons ("peau d'orange"), relief, projection, tonus.`,

    mandibular: `Zone mandibulaire: Ligne de la mâchoire et angle mandibulaire.
Caractéristiques: Définition de l'ovale, tonus cutané, présence de bajoues potentielles.
Points d'attention: Netteté de l'ovale, relâchement, accumulation graisseuse.`,

    cervical: `Zone cervicale: Cou antérieur et latéral.
Caractéristiques: Peau fine, muscles platysma, rides horizontales.
Points d'attention: Rides du cou, relâchement, double menton, bandes platysmales.`,
  };

  // Chercher une correspondance par mot-clé
  for (const [key, context] of Object.entries(contexts)) {
    if (zoneNameLower.includes(key)) {
      return context;
    }
  }

  // Contexte générique si aucune correspondance
  return `Zone faciale: ${zoneName} ${zoneDescription ? `- ${zoneDescription}` : ""}
Analyse générale: Observer texture, tonus, hydratation, pigmentation, signes de vieillissement.`;
}

export async function POST(request: Request) {
  const body = (await request.json()) as AnalysisRequest;
  const { sessionId, photoId, zoneId, imageDataUrl } = body;

  if (!sessionId || !photoId || !zoneId || !imageDataUrl) {
    return NextResponse.json(
      { error: "Parametres manquants." },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENROUTER_API_KEY ?? "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";
  const model = process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash";

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY manquant." },
      { status: 500 }
    );
  }

  // Récupérer les informations de la zone pour une analyse contextuelle
  const supabase = await createSupabaseServerClient();
  const { data: zoneInfo } = await supabase
    .from("face_zones")
    .select("label, description")
    .eq("id", zoneId)
    .maybeSingle();

  const zoneName = zoneInfo?.label ?? zoneId;
  const zoneDescription = zoneInfo?.description ?? "";

  // Créer un prompt contextuel basé sur la zone anatomique
  const zoneContext = getZoneContext(zoneName, zoneDescription);

  const prompt = `Analyse cette zone du visage: "${zoneName}" ${zoneDescription ? `(${zoneDescription})` : ""}.

CONTEXTE ANATOMIQUE:
${zoneContext}

INSTRUCTIONS:
1. Identifie les caractéristiques visuelles spécifiques à cette zone anatomique
2. Observe: texture cutanée, tonus, hydratation, vascularisation, pigmentation
3. Note les signes de vieillissement ou particularités propres à cette zone
4. Sois précis et utilise une terminologie esthétique professionnelle
5. Ne pose JAMAIS de diagnostic médical - reste dans l'observation esthétique

IMPORTANT: Comprends bien de quelle partie du visage il s'agit grâce au nom de la zone et à son emplacement anatomique. Adapte ton analyse en conséquence.

Réponds UNIQUEMENT en JSON strict avec cette structure:
{
  "summary": "Résumé de l'observation en 1-2 phrases",
  "observations": ["Observation 1", "Observation 2", ...],
  "possibleConcerns": ["Préoccupation esthétique 1", ...],
  "suggestedFocus": ["Suggestion de soin 1", ...],
  "disclaimer": "Clause de non-responsabilité médicale"
}`;

  const payload = {
    model,
    temperature: 0.3,
    max_tokens: 1000,
    messages: [
      {
        role: "system",
        content: `Tu es un assistant d'analyse visuelle esthétique expert en anatomie faciale.
Tu comprends parfaitement les différentes zones du visage (frontale, glabellaire, temporale, péri-orbitaire, malaire, nasale, péri-orale, mandibulaire, etc.) et leurs caractéristiques spécifiques.
Tu analyses les images en tenant compte de la localisation anatomique précise de la zone.
Tu donnes des observations esthétiques professionnelles, JAMAIS de diagnostics médicaux.`,
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

  // Réutiliser l'instance supabase déjà créée
  const { data: inserted, error: insertError } = await supabase
    .from("face_zone_analyses")
    .insert({
      session_id: sessionId,
      photo_id: photoId,
      zone_id: zoneId,
      result: parsed,
    })
    .select("id, zone_id, result, created_at")
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: inserted });
}
