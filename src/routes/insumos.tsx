import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Page, Card, Btn, Field, Input, Select, StockBadge, Modal } from "@/components/ui-kit";
import { useStore, setState } from "@/lib/store";
import { money, uid, type Material } from "@/lib/inventory";
import { useAccount } from '@/components/AccountProvider';
import { allowed } from '@/lib/permissions';
import { ProductPhoto } from '@/components/ProductPhoto';
import { applyMaterialPhoto } from '@/lib/material-photo';

export const Route = createFileRoute("/insumos")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Insumos — Rauff" },
      { name: "description", content: "Bobinas de filamento por marca y color, argollas, bolsas, espirales y hojas." },
      { property: "og:title", content: "Insumos — Rauff" },
      { property: "og:description", content: "Control de filamentos y materias primas con alerta de stock bajo." },
    ],
  }),
  component: Insumos,
});

const blank = (kind: Material["kind"]): Material =>
  kind === "filamento"
    ? { id: uid(), name: "", kind, unit: "g", brand: "", material: "PLA", color: "", totalG: 1000, stock: 1000, minStock: 200, unitCost: 20 }
    : { id: uid(), name: "", kind, unit: "u", stock: 0, minStock: 50, unitCost: 0 };

function Insumos() {
  const {user,settings}=useAccount();
  const canEdit=!user||allowed(settings?.access??null,'inventory');
  const costs=!user||allowed(settings?.access??null,'costs');
  const { materials } = useStore();
  const [edit, setEdit] = useState<Material | null>(null);
  const fil = materials.filter((m) => m.kind === "filamento");
  const uni = materials.filter((m) => m.kind === "unitario");
  const set = (k: keyof Material, v: unknown) => setEdit((e) => (e ? { ...e, [k]: v } : e));
  const save = () => {
    if (!canEdit || !edit) return;
    const m = edit.kind === "filamento" ? { ...edit, name: edit.name || `${edit.material} ${edit.color}` } : edit;
    if (!m.name) return;
    setState((s) => ({ ...s, materials: s.materials.some((x) => x.id === m.id) ? s.materials.map((x) => (x.id === m.id ? m : x)) : [...s.materials, m] }));
    setEdit(null);
  };

  return (
    <Page title="Insumos" actions={canEdit&&<div className="flex gap-2"><Btn variant="ghost" onClick={() => setEdit(blank("unitario"))}>+ Insumo</Btn><Btn onClick={() => setEdit(blank("filamento"))}>+ Bobina</Btn></div>}>
      <h2 className="mb-3 font-display text-lg font-bold">Filamentos</h2>
      <div className="flex flex-col gap-3">
        {fil.map((m) => {
          const pct = Math.max(0, Math.min(100, (m.stock / (m.totalG || 1000)) * 100));
          const low = m.stock <= m.minStock;
          return (
            <Card key={m.id} className="cursor-pointer hover:border-primary">
              <div onClick={() => canEdit && setEdit(m)}>
                <div className="flex justify-between text-xs text-muted-foreground"><span>{m.brand}</span><span className="font-semibold">{m.material}</span></div>
                <div className="font-semibold">{m.color}</div>
                {m.description&&<p className="mt-1 text-sm text-muted-foreground">{m.description}</p>}
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"><div className={`h-full ${low ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} /></div>
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm"><span className={low ? "font-semibold text-destructive" : ""}>{low && "⚠ "}{m.stock} g / {m.totalG} g</span>{costs&&<span className="text-muted-foreground">{money(m.unitCost * 1000)}/kg</span>}</div>
              </div>
            </Card>
          );
        })}
      </div>
      <h2 className="mb-3 mt-8 font-display text-lg font-bold">Insumos unitarios</h2>
      <Card className="p-0">
        <ul className="divide-y">
          {uni.map((m) => (
            <li key={m.id} onClick={() => canEdit && setEdit(m)} className="flex cursor-pointer items-center justify-between gap-2 p-4 hover:bg-accent">
              <div className="min-w-0"><div className="font-medium">{m.name}</div>{m.description&&<p className="mt-1 text-sm text-muted-foreground">{m.description}</p>}<div className="text-xs text-muted-foreground">{costs&&`${money(m.unitCost)} c/u · `}mín. {m.minStock}</div></div>
              <StockBadge stock={m.stock} min={m.minStock} />
            </li>
          ))}
        </ul>
      </Card>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.kind === "filamento" ? "Bobina de filamento" : "Insumo unitario"}>
        {edit && (
          <div className="space-y-3">
            {!materials.some(m=>m.id===edit.id)&&<ProductPhoto key={edit.id} target={edit.kind} onSuggestion={suggestion=>setEdit(current=>current?applyMaterialPhoto(current,suggestion):current)}/>}
            <Field label="Nombre"><Input value={edit.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="Descripción breve"><Input maxLength={180} value={edit.description ?? ''} onChange={e=>set('description',e.target.value)}/></Field>
            {edit.kind === "filamento" ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Marca"><Input value={edit.brand} onChange={(e) => set("brand", e.target.value)} /></Field>
                <Field label="Material"><Select value={edit.material} onChange={(e) => set("material", e.target.value)}>{["PLA", "PETG", "ABS", "TPU", "ASA", "PLA+"].map((x) => <option key={x}>{x}</option>)}</Select></Field>
                <Field label="Color"><Input value={edit.color} onChange={(e) => set("color", e.target.value)} /></Field>
                <Field label="Peso total (g)"><Input type="number" value={edit.totalG} onChange={(e) => set("totalG", +e.target.value)} /></Field>
                <Field label="¿Cuánto stock tienes? (g)"><Input type="number" min={0} inputMode="decimal" value={edit.stock} onChange={(e) => set("stock", +e.target.value)} /></Field>
                <Field label="Alerta bajo (g)"><Input type="number" value={edit.minStock} onChange={(e) => set("minStock", +e.target.value)} /></Field>
                <Field label="Precio por kg"><Input type="number" value={+(edit.unitCost * 1000).toFixed(2)} onChange={(e) => set("unitCost", +e.target.value / 1000)} /></Field>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Field label="¿Cuánto stock tienes? (u)"><Input type="number" min={0} step={1} inputMode="numeric" value={edit.stock} onChange={(e) => set("stock", +e.target.value)} /></Field>
                <Field label="Stock mínimo"><Input type="number" value={edit.minStock} onChange={(e) => set("minStock", +e.target.value)} /></Field>
                <Field label="Costo unitario"><Input type="number" value={edit.unitCost} onChange={(e) => set("unitCost", +e.target.value)} /></Field>
              </div>
            )}
            <div className="flex justify-between pt-2">
              <Btn variant="danger" onClick={() => { setState((s) => ({ ...s, materials: s.materials.filter((x) => x.id !== edit.id) })); setEdit(null); }}>Eliminar</Btn>
              <Btn onClick={save}>Guardar</Btn>
            </div>
          </div>
        )}
      </Modal>
    </Page>
  );
}
