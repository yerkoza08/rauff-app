import { createServerFn } from "@tanstack/react-start";

type CatalogItem = { id: string; name: string; category: string };
type Input = { image: string; catalog: CatalogItem[] };
export type DetectedItem = { productId: string | null; quantity: number; confidence: number; description: string; alternatives: string[] };
export type Suggestion = { items: DetectedItem[] };
export type IdentifyResult = { ok: true; suggestion: Suggestion } | { ok: false; error: string };

const item = {
  type: "object",
  additionalProperties: false,
  required: ["productId", "quantity", "confidence", "description", "alternatives"],
  properties: {
    productId: { type: ["string", "null"], description: "id del catálogo, o null si no coincide con ninguno" },
    quantity: { type: "integer", description: "unidades visibles de este producto" },
    confidence: { type: "number", description: "0 a 1" },
    description: { type: "string", description: "qué se ve, breve, en español" },
    alternatives: { type: "array", items: { type: "string" }, description: "hasta 2 ids alternativos" },
  },
};
const schema = { type: "object", additionalProperties: false, required: ["items"], properties: { items: { type: "array", items: item } } };

export const identifyProduct = createServerFn({ method: "POST" })
  .inputValidator((d: Input) => {
    if (!d?.image?.startsWith("data:image/") || d.image.length > 6_000_000) throw new Error("Imagen inválida");
    if (!Array.isArray(d.catalog) || d.catalog.length === 0) throw new Error("Catálogo vacío");
    return { image: d.image, catalog: d.catalog.slice(0, 300).map((c) => ({ id: String(c.id), name: String(c.name), category: String(c.category) })) };
  })
  .handler(async ({ data }): Promise<IdentifyResult> => {
    const apiKey = process.env['LOVABLE_API_KEY'];
    if (!apiKey) return { ok: false, error: "Falta configurar la IA." };
    const catalog = data.catalog.map((c) => `${c.id} | ${c.name} | ${c.category}`).join("\n");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        text: { format: { type: "json_schema", name: "suggestion", strict: true, schema } },
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: `Eres asistente de mostrador de una tienda de juguetes, llaveros, agendas y figuras 3D. Identifica TODOS los artículos distintos que aparecen en la foto y cuenta cuántas unidades hay de cada uno. Agrupa unidades iguales en un solo ítem. Usa solo ids del catálogo; si algo no está en el catálogo, usa productId null.\n\nCatálogo (id | nombre | categoría):\n${catalog}` },
              { type: "input_image", image_url: data.image },
            ],
          },
        ],
      }),
    });
    if (!res.ok || !res.body) {
      let msg = "";
      try { msg = (await res.json())?.error?.message ?? ""; } catch {}
      if (res.status === 402) return { ok: false, error: msg || "Créditos de IA agotados." };
      if (res.status === 429) return { ok: false, error: "Demasiadas solicitudes, intenta en un momento." };
      if (res.status === 403) return { ok: false, error: msg || "Acceso a la IA denegado." };
      return { ok: false, error: msg || `Error de IA (${res.status})` };
    }
    // Consume SSE stream server-side and accumulate output text.
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", text = "", refused = false;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n\n")) >= 0) {
        const frame = buf.slice(0, i);
        buf = buf.slice(i + 2);
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const raw = line.slice(5).trim();
          if (!raw || raw === "[DONE]") continue;
          try {
            const ev = JSON.parse(raw);
            if (ev.type === "response.output_text.delta") text += ev.delta;
            if (ev.type === "response.refusal.delta") refused = true;
            if (ev.type === "error" || ev.type === "response.failed") return { ok: false, error: ev.error?.message ?? ev.response?.error?.message ?? "La IA falló." };
          } catch {}
        }
      }
    }
    if (refused || !text) return { ok: false, error: "La IA no pudo analizar la foto." };
    try {
      const s = JSON.parse(text) as Suggestion;
      const ids = new Set(data.catalog.map((c) => c.id));
      const items = s.items.map((it) => {
        const productId = it.productId && ids.has(it.productId) ? it.productId : null;
        return { ...it, productId, quantity: Math.max(1, Math.round(it.quantity || 1)), alternatives: it.alternatives.filter((a) => ids.has(a) && a !== productId) };
      });
      return { ok: true, suggestion: { items } };
    } catch {
      return { ok: false, error: "Respuesta de IA inválida." };
    }
  });
