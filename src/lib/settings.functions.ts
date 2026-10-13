import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

const accessSchema = z.object({ role: z.enum(['admin','vendedor','taller']), active: z.boolean(), sales: z.boolean(), costs: z.boolean(), inventory: z.boolean() });
export const accountSettings = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: access, error } = await context.supabase.from('user_roles').select('*').eq('user_id', context.userId).single();
  if (error || !access) throw new Error('No se pudo cargar tu cuenta.');
  const { data: profile } = await context.supabase.from('profiles').select('*').eq('id', context.userId).single();
  const { data: business } = await context.supabase.from('businesses').select('*').eq('id', access.business_id).maybeSingle();
  const { data: users } = access.active && access.role === 'admin' ? await context.supabase.from('profiles').select('*') : { data: null };
  // Separate queries: profiles and roles both reference Auth, not each other.
  const { data: roles } = access.active && access.role === 'admin' ? await context.supabase.from('user_roles').select('*') : { data: null };
  const { data: invitations } = access.active && access.role === 'admin' ? await context.supabase.from('invitations').select('*').is('accepted_at', null) : { data: null };
  return { access, profile, business, users: users ?? [], roles: roles ?? [], invitations: invitations ?? [] };
});
export const inviteUser = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ email: z.string().email(), name: z.string().trim().min(1).max(100), access: accessSchema, origin: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc('business_admin');
    if (!admin) throw new Error('Solo un administrador puede invitar usuarios.');
    const { data: businessId } = await context.supabase.rpc('my_business');
    if (!businessId) throw new Error('Negocio no disponible.');
    const { getRequest } = await import('@tanstack/react-start/server');
    const request = getRequest();
    if (new URL(data.origin).origin !== new URL(request.url).origin) throw new Error('Dirección de retorno inválida.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const email = data.email.trim().toLowerCase();
    const { data: existing } = await supabaseAdmin.from('profiles').select('id').eq('email',email).maybeSingle();
    if (existing) throw new Error('Este correo ya tiene una cuenta.');
    const { error } = await supabaseAdmin.from('invitations').upsert({ business_id: businessId, email, name: data.name, role: data.access.role, sales: data.access.sales, costs: data.access.costs, inventory: data.access.inventory },{ onConflict:'business_id,email' });
    if (error) throw new Error('No se pudo guardar la invitación.');
    const result = await supabaseAdmin.auth.admin.inviteUserByEmail(email, { data: { name: data.name }, redirectTo: `${new URL(data.origin).origin}/reset-password` });
    if (result.error) {
      await supabaseAdmin.from('invitations').delete().eq('business_id',businessId).eq('email',email).is('accepted_at',null);
      throw new Error('No se pudo enviar la invitación. Inténtalo de nuevo.');
    }
    return { ok: true };
  });
export const changeUserAccess = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid(), access: accessSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc('business_admin');
    const { data: businessId } = await context.supabase.rpc('my_business');
    if (!admin || !businessId) throw new Error('Solo un administrador puede cambiar permisos.');
    if (data.userId === context.userId) throw new Error('No puedes cambiar tu propio acceso.');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: updated, error } = await supabaseAdmin.from('user_roles').update(data.access).eq('user_id',data.userId).eq('business_id',businessId).select('user_id').single();
    if (error || !updated) throw new Error('No se pudieron cambiar los permisos.');
    return { ok: true };
  });