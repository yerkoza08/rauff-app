import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Page, Card, Btn, Field, Input, Select } from "@/components/ui-kit";
import { useStore, setState } from "@/lib/store";
import { useAccount } from '@/components/AccountProvider';
import { allowed } from '@/lib/permissions';
import { produce, sellMany, addToCart, shortages, money, type SaleLine } from "@/lib/inventory";
import { CameraIdentify } from "@/components/CameraIdentify";

export const Route = createFileRoute("/movimientos")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Ventas y producción — Rauff" },
      { name: "description", content: "Registra ventas y órdenes de producción con descuento automático de insumos." },
      { property: "og:title", content: "Ventas y producción — Rauff" },
      { property: "og:description", content: "Descuento automático de stock e insumos según receta." },
    ],
  }),
  component: Movimientos,
});

function Movimientos() {
  const {user,settings}=useAccount();
  const canSell=!user||allowed(settings?.access??null,'sales');
  const canProduce=!user||allowed(settings?.access??null,'inventory');
  const { products, materials, movements } = useStore();
  const [mode, setMode] = useState<"venta" | "produccion">("venta");
  const [pid, setPid] = useState(products[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [onDemand, setOnDemand] = useState(false);
  const [cart, setCart] = useState<SaleLine[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const p = products.find((x) => x.id === pid);
  const avail = mode === "produccion" ? products.filter((x) => x.bom.length) : products;
  const consumesBom = mode === "produccion" || onDemand;
  const short = p && consumesBom ? shortages(p, qty, materials) : [];

  const submit = () => {
    if(mode==='venta'?!canSell:!canProduce)return;
    try {
      if (mode === "venta") {
        setState((s) => sellMany(s, cart));
        setCart([]);
        setMsg({ ok: true, t: "Venta registrada" });
      } else {
        setState((s) => produce(s, pid, qty));
        setMsg({ ok: true, t: "Producción registrada" });
      }
    } catch (e) {
      setMsg({ ok: false, t: (e as Error).message });
    }
  };
  const addLine = () => {
    if (!p) return;
    setCart((c) => addToCart(c, { productId: pid, qty, madeToOrder: onDemand && p.bom.length > 0 }));
    setQty(1);
    setMsg(null);
  };
  const total = cart.reduce((t, l) => t + (products.find((x) => x.id === l.productId)?.price ?? 0) * l.qty, 0);

  return (
    <Page title="Ventas y producción">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-4 grid grid-cols-2 rounded-lg bg-secondary p-1">
            {(["venta", "produccion"] as const).map((m) => (
              <Btn variant={mode===m?'primary':'ghost'} disabled={m==='venta'?!canSell:!canProduce} key={m} onClick={() => { setMode(m); setMsg(null); }}>{m === "venta" ? "Venta" : "Producción"}</Btn>
            ))}
          </div>
          <div className="space-y-3">
            {mode === "venta" && <CameraIdentify products={products} onConfirm={(lines) => { setCart((c) => lines.reduce(addToCart, c)); setMsg({ ok: true, t: `${lines.length} artículo(s) agregados a la venta.` }); }} />}
            <Field label="Producto"><Select value={pid} onChange={(e) => setPid(e.target.value)}>{avail.map((x) => <option key={x.id} value={x.id}>{x.name} (stock {x.stock})</option>)}</Select></Field>
            <Field label="Cantidad"><Input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, +e.target.value))} /></Field>
            {mode === "venta" && p && p.bom.length > 0 && (
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onDemand} onChange={(e) => setOnDemand(e.target.checked)} />Fabricar bajo pedido (descontar insumos en vez de stock terminado)</label>
            )}
            {p && consumesBom && p.bom.length > 0 && (
              <div className="rounded-lg bg-secondary p-3 text-sm">
                <div className="mb-1 font-semibold">Insumos a descontar</div>
                {p.bom.map((l) => {
                  const m = materials.find((x) => x.id === l.materialId);
                  const need = l.qty * qty;
                  return <div key={l.materialId} className={`flex justify-between ${m && need > m.stock ? "text-destructive" : ""}`}><span>{m?.name}</span><span>{need} {m?.unit} / {m?.stock}</span></div>;
                })}
              </div>
            )}
            {mode === "venta" ? (
              <>
                <Btn variant="ghost" className="w-full" onClick={addLine} disabled={!p || (!onDemand && p.stock < qty) || short.length > 0}>+ Agregar a la venta</Btn>
                <div className="rounded-lg border p-3">
                  <div className="mb-2 text-sm font-semibold">Venta actual</div>
                  {cart.length === 0 && <p className="text-sm text-muted-foreground">Sin artículos.</p>}
                  <ul className="divide-y text-sm">
                    {cart.map((l, i) => {
                      const prod = products.find((x) => x.id === l.productId);
                      return (
                        <li key={i} className="flex items-center gap-2 py-2">
                          <span className="flex-1">{prod?.name}{l.madeToOrder && <span className="ml-1 text-xs text-muted-foreground">(bajo pedido)</span>}</span>
                          <Input type="number" min={1} className="w-16 py-1" value={l.qty} onChange={(e) => setCart((c) => c.map((x, j) => (j === i ? { ...x, qty: Math.max(1, +e.target.value) } : x)))} aria-label="Cantidad" />
                          <span className="w-16 text-right">{money((prod?.price ?? 0) * l.qty)}</span>
                          <button className="text-destructive" onClick={() => setCart((c) => c.filter((_, j) => j !== i))} aria-label="Quitar">✕</button>
                        </li>
                      );
                    })}
                  </ul>
                  {cart.length > 0 && <div className="mt-2 flex justify-between border-t pt-2 font-semibold"><span>Total</span><span>{money(total)}</span></div>}
                </div>
                <Btn className="w-full py-3" onClick={submit} disabled={!canSell||!cart.length}>Registrar venta</Btn>
              </>
            ) : (
              <Btn className="w-full py-3" onClick={submit} disabled={!canProduce||!p || short.length > 0}>Registrar producción</Btn>
            )}
            {msg && <p className={`text-sm ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.t}</p>}
          </div>
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between"><h2 className="font-display font-bold">Historial</h2></div>
          {movements.length === 0 && <p className="text-sm text-muted-foreground">Sin movimientos.</p>}
          <ul className="max-h-[480px] divide-y overflow-y-auto text-sm">
            {movements.map((m) => <li key={m.id} className="flex justify-between gap-2 py-2"><span><span className="mr-2 rounded bg-secondary px-1.5 py-0.5 text-xs capitalize">{m.type}</span>{m.detail}</span><span className="shrink-0 text-xs text-muted-foreground">{new Date(m.date).toLocaleString()}</span></li>)}
          </ul>
        </Card>
      </div>
    </Page>
  );
}
