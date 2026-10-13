import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useRouter } from '@tanstack/react-router';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { accountSettings } from '@/lib/settings.functions';
import { connectCloud, disconnectCloud, refreshCloud } from '@/lib/store';

type Settings = Awaited<ReturnType<typeof accountSettings>>;
const Account = createContext<{ user: User | null; loading: boolean; settings: Settings | undefined; refresh: () => Promise<unknown>; error: string | null }>({ user:null, loading:true, settings:undefined, refresh:async()=>{}, error:null });
export const useAccount = () => useContext(Account);
export function AccountProvider({ children }: { children: ReactNode }) {
  const [user,setUser] = useState<User | null>(null);
  const [ready,setReady] = useState(false);
  const router = useRouter();
  const fetchSettings = useServerFn(accountSettings);
  const query = useQuery({ queryKey:['account',user?.id], queryFn:()=>fetchSettings(), enabled:!!user, retry:false });
  useEffect(()=>{
    let mounted=true;
    supabase.auth.getUser().then(({data})=>{ if(mounted){setUser(data.user);setReady(true);} });
    const { data:{subscription} } = supabase.auth.onAuthStateChange((event,session)=>{
      if(!['SIGNED_IN','SIGNED_OUT','USER_UPDATED'].includes(event)) return;
      setUser(session?.user ?? null); setReady(true); router.invalidate();
      if(event!=='SIGNED_OUT') router.options.context.queryClient.invalidateQueries();
    });
    return()=>{mounted=false;subscription.unsubscribe();};
  },[router]);
  const access=query.data?.access;
  useEffect(()=>{
    if(!user||!access?.active){disconnectCloud();return;}
    const isAdmin=access.role==='admin';
    void connectCloud(access.business_id,{isAdmin,canWrite:isAdmin||access.sales||access.inventory});
    const onFocus=()=>void refreshCloud();
    window.addEventListener('focus',onFocus);
    const t=setInterval(onFocus,20000);
    return()=>{window.removeEventListener('focus',onFocus);clearInterval(t);};
  },[user,access?.business_id,access?.active,access?.role,access?.sales,access?.inventory]);
  return <Account.Provider value={{user,loading:!ready || (!!user && query.isPending),settings:query.data,refresh:query.refetch,error:query.error ? 'No se pudo cargar tu cuenta. Inténtalo de nuevo.' : null}}>{children}</Account.Provider>;
}