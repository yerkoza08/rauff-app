import { createFileRoute, Link } from "@tanstack/react-router";
import { Page, Card, StockBadge } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { isLow, money } from "@/lib/inventory";
import { useAccount } from '@/components/AccountProvider';
import { allowed } from '@/lib/permissions';

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Panel — Rauff" },
      { name: "description", content: "Resumen de inventario, alertas de stock bajo y movimientos del taller." },
      { property: "og:title", content: "Panel — Rauff" },
      { property: "og:description", content: "Inventario de juguetes, llaveros, agendas e impresiones 3D." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const {user,settings}=useAccount();
  const costs=!user||allowed(settings?.access??null,'costs');
  const { products, materials, movements } = useStore();
  const lowP = products.filter(isLow);
  const lowM = materials.filter(isLow);
  const value = products.reduce((s, p) => s + p.cost * p.stock, 0);
  const matValue = materials.reduce((s, m) => s + m.unitCost * m.stock, 0);
  const stats = [
    { l: "Productos", v: products.length },
    { l: "Valor stock productos", v: money(value) },
    { l: "Valor insumos", v: money(matValue) },
    { l: "Alertas", v: lowP.length + lowM.length },
  ];
  return (
    <Page title="Inicio">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.filter(s=>costs||!s.l.startsWith('Valor')).map((s) => (
          <Card key={s.l}>
            <div className="text-xs text-muted-foreground">{s.l}</div>
            <div className="mt-1 font-display text-2xl font-bold">{s.v}</div>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-display font-bold">⚠ Stock bajo</h2>
          {lowP.length + lowM.length === 0 && <p className="text-sm text-muted-foreground">Todo en orden.</p>}
          <ul className="divide-y text-sm">
            {lowP.map((p) => (
              <li key={p.id} className="flex justify-between py-2"><Link to="/productos" className="hover:underline">{p.name}</Link><StockBadge stock={p.stock} min={p.minStock} /></li>
            ))}
            {lowM.map((m) => (
              <li key={m.id} className="flex justify-between py-2"><Link to="/insumos" className="hover:underline">{m.name}</Link><StockBadge stock={m.stock} min={m.minStock} unit={m.unit} /></li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-3 font-display font-bold">Últimos movimientos</h2>
          {movements.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay ventas ni producciones.</p>}
          <ul className="divide-y text-sm">
            {movements.slice(0, 8).map((m) => (
              <li key={m.id} className="flex justify-between gap-2 py-2">
                <span><span className="mr-2 rounded bg-secondary px-1.5 py-0.5 text-xs capitalize">{m.type}</span>{m.detail}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{new Date(m.date).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Page>
  );
}
