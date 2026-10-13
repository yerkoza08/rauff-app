import { useEffect, useState } from 'react';
import rauffLogo from '@/assets/rauff-logo.png.asset.json';
import { useAccount } from './AccountProvider';
import { supabase } from '@/integrations/supabase/client';
export function Brand() {
  const { settings } = useAccount();
  const [url,setUrl] = useState('');
  const path=settings?.business?.logo_path;
  useEffect(()=>{let live=true;setUrl('');if(path) supabase.storage.from('brand-avatars').createSignedUrl(path,3600).then(({data})=>{if(live)setUrl(data?.signedUrl ?? '');});return()=>{live=false;};},[path]);
  const name=settings?.business?.name;
  return <div className="min-w-0">{url?<div className="flex items-center gap-3"><img src={url} alt="Logo del negocio" className="h-10 w-10 shrink-0 rounded-lg object-contain"/><span className="break-words font-display text-lg font-bold">{name ?? 'Rauff'}</span></div>:<><div className="relative h-11 w-40 overflow-hidden bg-card"><img src={rauffLogo.url} alt="Rauff" className="absolute left-0 top-1/2 w-40 max-w-none -translate-y-[45%]"/></div>{name&&name!=='Mi taller'&&name!=='Rauff'&&<span className="block break-words text-sm font-semibold">{name}</span>}</>}</div>;
}