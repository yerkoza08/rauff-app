import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Page, Card, Field, Input } from "@/components/ui-kit";
import { printCost, priceFromMargin, marginOf, money, type PrintInput } from "@/lib/inventory";
import { useAccount } from '@/components/AccountProvider';
import { allowed } from '@/lib/permissions';

export const Route = createFileRoute("/calculadora")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Calculadora de costos — Rauff" },
      { name: "description", content: "Calcula el costo real de impresiones 3D y márgenes comerciales de reventa." },
      { property: "og:title", content: "Calculadora de costos — Rauff" },
      { property: "og:description", content: "Filamento, electricidad, desgaste y margen en un solo lugar." },
    ],
  }),
  component: Calc,
});

const Row = ({ l, v, strong }: { l: string; v: string; strong?: boolean }) => (
  <div className={`flex justify-between py-1.5 ${strong ? "border-t pt-3 text-lg font-bold" : "text-sm"}`}><span>{l}</span><span>{v}</span></div>
);

function Calc() {
  const {user,settings}=useAccount();
  const [i, setI] = useState<PrintInput>({ grams: 85, costPerKg: 20000, hours: 6, watts: 150, kwhPrice: 160, wearPerHour: 80, extras: 500, margin: 60 });
  const r = printCost(i);
  const f = (k: keyof PrintInput, label: string, step = "10") => (
    <Field label={label}><Input type="number" step={step} value={i[k]} onChange={(e) => setI({ ...i, [k]: +e.target.value })} /></Field>
  );
  const [c, setC] = useState({ packCost: 9600, units: 12, shipping: 2000, margin: 40, price: 1800 });
  const unit = (c.packCost + c.shipping) / Math.max(1, c.units);
  if(user&&!allowed(settings?.access??null,'costs'))return <Page title="Costos"><p className="text-muted-foreground">Tu cuenta no tiene permiso para ver costos.</p></Page>;

  return (
    <Page title="Calculadora de costos" subtitle="Impresión 3D y márgenes comerciales">
      <div className="grid gap-4">
        <Card>
          <h2 className="mb-4 font-display text-lg font-bold">{settings?.business?.calculator_3d_name ?? 'Impresión 3D'}</h2>
          <div className="grid grid-cols-2 gap-3">
            {f("grams", "Filamento (g)", "1")}
            {f("costPerKg", "Precio bobina por kg")}
            {f("hours", "Tiempo de impresión (h)", "0.1")}
            {f("watts", "Consumo impresora (W)", "1")}
            {f("kwhPrice", "Precio kWh")}
            {f("wearPerHour", "Desgaste boquilla/máquina por h")}
            {f("extras", "Extras (argolla, bolsa…)")}
            {f("margin", "Margen deseado (%)", "1")}
          </div>
          <div className="mt-4 rounded-lg bg-secondary p-4">
            <Row l={`Filamento (${money(i.costPerKg / 1000)}/g)`} v={money(r.material)} />
            <Row l="Electricidad" v={money(r.energy)} />
            <Row l="Desgaste" v={money(r.wear)} />
            <Row l="Extras" v={money(i.extras)} />
            <Row l="Costo total" v={money(r.total)} strong />
            <Row l={`Precio sugerido (${i.margin}% margen)`} v={money(r.price)} strong />
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 font-display text-lg font-bold">{settings?.business?.calculator_trade_name ?? 'Mayorista / artesanal'}</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Costo del lote"><Input type="number" value={c.packCost} onChange={(e) => setC({ ...c, packCost: +e.target.value })} /></Field>
            <Field label="Unidades del lote"><Input type="number" value={c.units} onChange={(e) => setC({ ...c, units: +e.target.value })} /></Field>
            <Field label="Flete / otros"><Input type="number" value={c.shipping} onChange={(e) => setC({ ...c, shipping: +e.target.value })} /></Field>
            <Field label="Margen deseado (%)"><Input type="number" value={c.margin} onChange={(e) => setC({ ...c, margin: +e.target.value })} /></Field>
          </div>
          <div className="mt-4 rounded-lg bg-secondary p-4">
            <Row l="Costo unitario real" v={money(unit)} />
            <Row l="Precio sugerido" v={money(priceFromMargin(unit, c.margin))} strong />
            <Row l="Markup equivalente" v={`${(c.margin >= 100 ? 0 : (c.margin / (100 - c.margin)) * 100).toFixed(0)}%`} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="¿Y si vendo a…?"><Input type="number" value={c.price} onChange={(e) => setC({ ...c, price: +e.target.value })} /></Field>
            <div className="self-end pb-2 text-sm">Margen: <b className="text-primary">{marginOf(unit, c.price).toFixed(1)}%</b> · Ganancia lote: <b>{money((c.price - unit) * c.units)}</b></div>
          </div>
        </Card>
      </div>
    </Page>
  );
}
