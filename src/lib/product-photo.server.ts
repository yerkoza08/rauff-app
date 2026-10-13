import { Output, streamText, APICallError, NoObjectGeneratedError } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { createLovableAiGatewayRunIdFetch } from './ai/run-id.ts';
import { sdkImage } from './ai/media-parts.ts';

export async function describePhoto(image: string, target: 'producto' | 'unitario' | 'filamento' = 'producto') {
  const key = process.env['LOVABLE_API_KEY'];
  if (!key) throw new Error('Falta configurar la IA.');
  const correlation = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({baseURL:'https://ai.gateway.lovable.dev/v1',apiKey:key,headers:{'Lovable-API-Key':key,'X-Lovable-AIG-SDK':'vercel-ai-sdk'},fetch:correlation.fetch});
  try {
    const result = streamText({
      model:provider.responses('openai/gpt-6-astra'), maxRetries:0,
      instructions: (target === 'producto'
        ? 'Describe el producto principal visible para un catálogo de juguetes, agendas, llaveros y figuras 3D.'
        : target === 'filamento'
          ? 'Describe la bobina de filamento principal visible como insumo de un taller de impresión 3D, no como producto terminado.'
          : 'Describe el insumo principal visible para un taller de agendas, llaveros, juguetes e impresiones 3D, por ejemplo argollas, bolsas, espirales u hojas, no como producto terminado.') + ' Sugiere un nombre corto y una descripción breve en español de máximo 180 caracteres. Describe solo rasgos visibles, sin inventar marca, material, medidas, precio ni stock. Si no hay un objeto reconocible devuelve recognized false y cadenas vacías. La categoría es una sugerencia editable y se ignora para insumos.',
      messages:[{role:'user',content:[{type:'text',text:target === 'producto' ? 'Sugiere el nombre y descripción de este producto.' : 'Sugiere el nombre y descripción breve de este insumo.'},sdkImage(image)]}],
      output:Output.object({schema:z.object({recognized:z.boolean(),name:z.string(),description:z.string(),category:z.enum(['juguete','agenda','llavero','3d'])})}),
      providerOptions:{openai:{forceReasoning:true,reasoningEffort:'low',reasoningSummary:'auto',store:false,include:['reasoning.encrypted_content']}},
    });
    const output = await result.output;
    if (!output.recognized) throw new Error(target === 'producto' ? 'No se distingue un producto. Toma una foto más clara.' : 'No se distingue un insumo. Toma una foto más clara.');
    return {...output,name:output.name.slice(0,100),description:output.description.slice(0,180)};
  } catch(error) {
    if (APICallError.isInstance(error)) {
      let message=error.message;
      try {const body=JSON.parse(error.responseBody ?? '{}');message=body.error?.message ?? body.message ?? message;} catch {}
      throw new Error(message);
    }
    if (NoObjectGeneratedError.isInstance(error)) throw new Error('La IA no pudo describir esta foto.');
    throw error;
  }
}