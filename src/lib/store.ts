import { useSyncExternalStore } from "react";
import { seed, type State } from "./inventory";
import { supabase } from "@/integrations/supabase/client";

// localStorage cache; when signed in, the business's shared inventory in Cloud is the source of truth.
const KEY = "taller-inventario-v2"; // v2: seed values in CLP
let state: State = seed;
let loaded = false;
let cloud: { businessId: string; canWrite: boolean } | null = null;
const subs = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw);
  } catch {}
}
function apply(next: State) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  subs.forEach((f) => f());
}

export function setState(fn: (s: State) => State) {
  apply(fn(state));
  if (cloud?.canWrite) {
    void supabase.from("business_inventory").update({ state: state as never, updated_at: new Date().toISOString() }).eq("business_id", cloud.businessId);
  }
}
export function resetData() {
  setState(() => seed);
}

/** Load the shared business inventory; the first admin to connect publishes their local data. */
export async function connectCloud(businessId: string, opts: { canWrite: boolean; isAdmin: boolean }) {
  load();
  cloud = { businessId, canWrite: opts.canWrite };
  const { data } = await supabase.from("business_inventory").select("state").eq("business_id", businessId).maybeSingle();
  if (data?.state) apply(data.state as unknown as State);
  else if (opts.isAdmin) {
    const { error } = await supabase.from("business_inventory").insert({ business_id: businessId, state: state as never });
    if (error) console.error("inventory publish failed", error.message);
  }
}
export async function refreshCloud() {
  if (!cloud) return;
  const { data } = await supabase.from("business_inventory").select("state").eq("business_id", cloud.businessId).maybeSingle();
  if (data?.state) apply(data.state as unknown as State);
}
export function disconnectCloud() { cloud = null; }

export function useStore() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      if (!loaded) {
        load();
        cb();
      }
      return () => subs.delete(cb);
    },
    () => state,
    () => seed,
  );
}
