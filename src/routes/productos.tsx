import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Page, Card, Btn, Field, Input, Select, StockBadge, Modal } from "@/components/ui-kit";
import { useStore, setState } from "@/lib/store";
import { bomCost, marginOf, money, uid, type Category, type Product } from "@/lib/inventory";
import { useAccount } from '@/components/AccountProvider';
import { allowed } from '@/lib/permissions';
import { ProductPhoto } from '@/components/ProductPhoto';

export const Route = createFileRoute("/productos")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Productos — Rauff" },
      { name: "description", content: "Catálogo de juguetes de reventa, llaveros, agendas y figuras 3D con recetas de insumos." },
      { property: "og:title", content: "Productos — Rauff" },
      { property: "og:description", content: "Catálogo con costos, márgenes y recetas (BOM)." },
    ],
  }),
  component: Productos,
});

const cats: Record<Category, string> = { juguete: "Juguetes", llavero: "Llaveros", agenda: "Agendas", "3d": "Figuras 3D" };
const blank = (): Product => ({ id: uid(), name: "", category: "llavero", kind: "fabricado", cost: 0, price: 0, stock: 0, minStock: 5, bom: [] });

function Productos() {
  const {user,settings}=useAccount();
  const canEdit=!user||allowed(settings?.access??null,'inventory');
  const costs=!user||allowed(settings?.access??null,'costs');
  const { products, materials } = useStore();
  const [filter, setFilter] = useState<Category | "all">("all");
  const [edit, setEdit] = useState<Product | null>(null);
  const list = products.filter((p) => filter === "all" || p.category === filter);

  const save = () => {
    if (!canEdit || !edit || !edit.name) return;
    const p = edit.kind === "fabricado" && edit.bom.length ? { ...edit, cost: Math.round(bomCost(edit, materials)) } : edit;
    setState((s) => ({ ...s, products: s.products.some((x) => x.id === p.id) ? s.products.map((x) => (x.id === p.id ? p : x)) : [...s.products, p] }));
    setEdit(null);
  };
  const set = (k: keyof Product, v: unknown) => setEdit((e) => (e ? { ...e, [k]: v } : e));

  return (
    <Page title="Productos" actions={canEdit&&<Btn onClick={() => setEdit(blank())}>+ Nuevo producto</Btn>}>
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {(["all", ...Object.keys(cats)] as const).map((c) => (
          <Btn variant={filter===c?'primary':'ghost'} key={c} onClick={() => setFilter(c as Category | "all")} className="shrink-0">
            {c === "all" ? "Todos" : cats[c as Category]}
          </Btn>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {list.map((p) => (
          <Card key={p.id} className="cursor-pointer transition hover:border-primary">
            <div onClick={() => canEdit && setEdit(p)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{cats[p.category]} · {p.kind}</div>
                  <div className="font-semibold">{p.name}</div>
                  {p.description&&<p className="mt-1 text-sm text-muted-foreground">{p.description}</p>}
                </div>
                <StockBadge stock={p.stock} min={p.minStock} />
              </div>
              <div className="mt-3 grid grid-cols-3 text-sm">
                {costs&&<div><div className="text-xs text-muted-foreground">Costo</div>{money(p.cost)}</div>}
                <div><div className="text-xs text-muted-foreground">Precio</div>{money(p.price)}</div>
                {costs&&<div><div className="text-xs text-muted-foreground">Margen</div><span className="font-semibold text-primary">{marginOf(p.cost, p.price).toFixed(0)}%</span></div>}
              </div>
              {p.supplier && <div className="mt-2 text-xs text-muted-foreground">Proveedor: {p.supplier}</div>}
              {p.bom.length > 0 && <div className="mt-2 text-xs text-muted-foreground">{p.bom.length} insumos en la receta</div>}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && products.some((p) => p.id === edit.id) ? "Editar producto" : "Nuevo producto"}>
        {edit && (
          <div className="space-y-3">
            {!products.some(p=>p.id===edit.id)&&<ProductPhoto onSuggestion={suggestion=>setEdit(current=>current?{...current,...suggestion}:current)}/>}
            <Field label="Nombre"><Input value={edit.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="Descripción breve"><Input maxLength={180} value={edit.description ?? ''} onChange={e=>set('description',e.target.value)}/></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Categoría"><Select value={edit.category} onChange={(e) => set("category", e.target.value)}>{Object.entries(cats).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
              <Field label="Tipo"><Select value={edit.kind} onChange={(e) => set("kind", e.target.value)}><option value="reventa">Reventa</option><option value="fabricado">Fabricado</option></Select></Field>
              <Field label={edit.kind === "fabricado" && edit.bom.length ? `Costo (receta: ${money(bomCost(edit, materials))})` : "Costo de compra"}><Input type="number" value={edit.cost} onChange={(e) => set("cost", +e.target.value)} disabled={edit.kind === "fabricado" && edit.bom.length > 0} /></Field>
              <Field label={`Precio venta (${marginOf(edit.kind === "fabricado" && edit.bom.length ? bomCost(edit, materials) : edit.cost, edit.price).toFixed(0)}%)`}><Input type="number" value={edit.price} onChange={(e) => set("price", +e.target.value)} /></Field>
              <Field label="¿Cuánto stock tienes?"><Input type="number" min={0} step={1} inputMode="numeric" value={edit.stock} onChange={(e) => set("stock", +e.target.value)} /></Field>
              <Field label="Stock mínimo"><Input type="number" value={edit.minStock} onChange={(e) => set("minStock", +e.target.value)} /></Field>
            </div>
            {edit.kind === "reventa" && <Field label="Proveedor"><Input value={edit.supplier ?? ""} onChange={(e) => set("supplier", e.target.value)} /></Field>}
            {edit.kind === "fabricado" && (
              <div className="rounded-lg border p-3">
                <div className="mb-2 text-sm font-semibold">Receta (insumos por unidad)</div>
                {edit.bom.map((l, i) => (
                  <div key={i} className="mb-2 flex gap-2">
                    <Select value={l.materialId} onChange={(e) => set("bom", edit.bom.map((x, j) => (j === i ? { ...x, materialId: e.target.value } : x)))}>
                      {materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                    </Select>
                    <Input type="number" step="0.1" className="w-24" value={l.qty} onChange={(e) => set("bom", edit.bom.map((x, j) => (j === i ? { ...x, qty: +e.target.value } : x)))} />
                    <Btn variant="danger" onClick={() => set("bom", edit.bom.filter((_, j) => j !== i))}>✕</Btn>
                  </div>
                ))}
                <Btn variant="ghost" onClick={() => set("bom", [...edit.bom, { materialId: materials[0]?.id, qty: 1 }])}>+ Insumo</Btn>
              </div>
            )}
            <div className="flex justify-between pt-2">
              <Btn variant="danger" onClick={() => { setState((s) => ({ ...s, products: s.products.filter((x) => x.id !== edit.id) })); setEdit(null); }}>Eliminar</Btn>
              <Btn onClick={save}>Guardar</Btn>
            </div>
          </div>
        )}
      </Modal>
    </Page>
  );
}
