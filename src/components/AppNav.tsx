import { Link } from "@tanstack/react-router";
import { LayoutGrid, Package, Layers, Factory, Calculator, Settings } from "lucide-react";
import { Brand } from './Brand';
import { useAccount } from './AccountProvider';
import { allowed } from '@/lib/permissions';

const items = [
  { to: "/", label: "Inicio", icon: LayoutGrid },
  { to: "/productos", label: "Productos", icon: Package },
  { to: "/insumos", label: "Insumos", icon: Layers },
  { to: "/movimientos", label: "Ventas", icon: Factory },
  { to: "/calculadora", label: "Costos", icon: Calculator },
  { to: "/configuracion", label: "Configuración", icon: Settings },
] as const;

export function AppNav() {
  const {user,settings}=useAccount();
  const visible=items.filter(i=>!user || (i.to !== '/calculadora' || allowed(settings?.access ?? null,'costs')));
  const mobile=visible.filter(i=>i.to!=='/calculadora');
  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r bg-sidebar p-4 md:flex">
        <div className="mb-8"><Brand /></div>
        <nav className="space-y-1">
          {visible.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} activeOptions={{ exact: to === "/" }} className="flex min-h-12 items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent" activeProps={{ className: "bg-sidebar-accent font-semibold text-primary" }}>
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <header className="flex min-h-16 items-center justify-between gap-3 border-b bg-card px-4 py-3 md:hidden"><Brand />{(!user||allowed(settings?.access??null,'costs'))&&<Link to="/calculadora" aria-label="Calculadora de costos" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border"><Calculator className="h-5 w-5"/></Link>}</header>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {mobile.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} activeOptions={{ exact: to === "/" }} className="flex min-h-14 touch-manipulation flex-col items-center justify-center gap-1 py-2 text-[11px] text-muted-foreground active:bg-accent" activeProps={{ className: "text-primary font-semibold" }}>
            <Icon className="h-6 w-6" />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
