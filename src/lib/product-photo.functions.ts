import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

export const describeProductPhoto = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ image: z.string().max(6_000_000).regex(/^data:image\/(jpeg|png|webp);base64,/), target: z.enum(['producto', 'unitario', 'filamento']).default('producto') }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: access } = await context.supabase.from('user_roles').select('role,active,inventory').eq('user_id',context.userId).single();
    if (!access?.active || (access.role !== 'admin' && !access.inventory)) throw new Error('Tu cuenta no tiene permiso para agregar productos o insumos.');
    const { describePhoto } = await import('./product-photo.server');
    return describePhoto(data.image, data.target);
  });