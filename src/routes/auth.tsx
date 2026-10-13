import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Btn, Field, Input, Page } from '@/components/ui-kit';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { useAccount } from '@/components/AccountProvider';
export const Route = createFileRoute('/auth')({ head:()=>({meta:[{title:'Mi cuenta — Rauff'},{name:'description',content:'Accede a tu cuenta y a la configuración de tu negocio.'},{property:'og:title',content:'Mi cuenta — Rauff'},{property:'og:description',content:'Acceso seguro al equipo del taller.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}), component: Auth });
function Auth() {
  const {user}=useAccount(); const navigate=useNavigate();
  const [mode,setMode]=useState<'login'|'signup'|'forgot'>('login');
  const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [name,setName]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
  useEffect(()=>{if(user)navigate({to:'/configuracion'});},[user,navigate]);
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage('');try{
    if(mode==='forgot'){const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/reset-password`});if(error)throw error;setMessage('Revisa tu correo para cambiar la contraseña.');}
    else if(mode==='signup'){const {error}=await supabase.auth.signUp({email,password,options:{data:{name},emailRedirectTo:window.location.origin}});if(error)throw error;setMessage('Revisa tu correo y confirma tu cuenta antes de entrar.');}
    else {const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;}
  }catch{setMessage('No se pudo completar. Revisa tus datos e inténtalo de nuevo.');}finally{setBusy(false);}}
  return <Page title={mode==='signup'?'Crear mi cuenta':mode==='forgot'?'Recuperar contraseña':'Mi cuenta'}><form onSubmit={submit} className="mx-auto max-w-sm space-y-4 py-5">{mode==='signup'&&<Field label="Tu nombre"><Input required value={name} onChange={e=>setName(e.target.value)}/></Field>}<Field label="Correo"><Input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></Field>{mode!=='forgot'&&<Field label="Contraseña"><Input type="password" required minLength={8} autoComplete={mode==='signup'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)}/></Field>}<Btn className="w-full" disabled={busy}>{busy?'Espera…':mode==='signup'?'Crear cuenta':mode==='forgot'?'Enviar enlace':'Entrar'}</Btn>{message&&<p role="status" className="text-sm text-muted-foreground">{message}</p>}<Btn type="button" variant="ghost" className="w-full" onClick={async()=>{const r=await lovable.auth.signInWithOAuth('google',{redirect_uri:window.location.origin});if(r.error)setMessage('No se pudo entrar con Google.');}}>Continuar con Google</Btn><div className="flex flex-wrap justify-center gap-2"><Btn type="button" variant="ghost" onClick={()=>{setMode(mode==='signup'?'login':'signup');setMessage('');}}>{mode==='signup'?'Ya tengo cuenta':'Crear cuenta'}</Btn><Btn type="button" variant="ghost" onClick={()=>{setMode(mode==='forgot'?'login':'forgot');setMessage('');}}>{mode==='forgot'?'Volver':'Olvidé mi contraseña'}</Btn></div></form></Page>;
}