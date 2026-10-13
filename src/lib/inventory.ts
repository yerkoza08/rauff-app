// Pure domain logic: types, seed data and stock operations (no React).
export type Category = "juguete" | "agenda" | "llavero" | "3d";
export type BomLine = { materialId: string; qty: number };
export type Product = {
  id: string;
  name: string;
  description?: string;
  category: Category;
  kind: "reventa" | "fabricado";
  cost: number;
  price: number;
  supplier?: string;
  stock: number;
  minStock: number;
  bom: BomLine[];
};
export type Material = {
  id: string;
  name: string;
  description?: string;
  kind: "filamento" | "unitario";
  unit: "g" | "u";
  stock: number; // grams remaining for filament, units otherwise
  minStock: number;
  unitCost: number; // per gram or per unit
  brand?: string;
  material?: string;
  color?: string;
  totalG?: number;
};
export type Movement = { id: string; date: string; type: "venta" | "produccion" | "ajuste"; detail: string };
export type State = { products: Product[]; materials: Material[]; movements: Movement[] };

export const uid = () => Math.random().toString(36).slice(2, 10);

export const seed: State = {
  materials: [
    { id: "f1", name: "PLA Negro", kind: "filamento", unit: "g", brand: "eSun", material: "PLA", color: "Negro", totalG: 1000, stock: 640, minStock: 200, unitCost: 18 },
    { id: "f2", name: "PLA Blanco", kind: "filamento", unit: "g", brand: "Creality", material: "PLA", color: "Blanco", totalG: 1000, stock: 150, minStock: 200, unitCost: 16 },
    { id: "f3", name: "PETG Azul", kind: "filamento", unit: "g", brand: "Sunlu", material: "PETG", color: "Azul", totalG: 1000, stock: 920, minStock: 200, unitCost: 20 },
    { id: "f4", name: "ABS Rojo", kind: "filamento", unit: "g", brand: "Polymaker", material: "ABS", color: "Rojo", totalG: 1000, stock: 480, minStock: 200, unitCost: 22 },
    { id: "m1", name: "Argolla llavero 25mm", kind: "unitario", unit: "u", stock: 340, minStock: 100, unitCost: 50 },
    { id: "m2", name: "Bolsa celofán 8x12", kind: "unitario", unit: "u", stock: 60, minStock: 100, unitCost: 30 },
    { id: "m3", name: "Bolsa zip juguete 15x20", kind: "unitario", unit: "u", stock: 210, minStock: 80, unitCost: 60 },
    { id: "m4", name: "Espiral metálico A5", kind: "unitario", unit: "u", stock: 45, minStock: 20, unitCost: 350 },
    { id: "m5", name: "Hoja bond A5", kind: "unitario", unit: "u", stock: 2400, minStock: 500, unitCost: 10 },
  ],
  products: [
    { id: "p1", name: "Auto a fricción (pack 12)", category: "juguete", kind: "reventa", cost: 9600, price: 16800, supplier: "Juguetes Mayorista SA", stock: 24, minStock: 10, bom: [] },
    { id: "p2", name: "Pelota saltarina", category: "juguete", kind: "reventa", cost: 500, price: 1200, supplier: "ImportToys", stock: 8, minStock: 30, bom: [] },
    { id: "p3", name: "Llavero 3D personalizado", category: "llavero", kind: "fabricado", cost: 224, price: 3500, stock: 35, minStock: 15, bom: [{ materialId: "f1", qty: 8 }, { materialId: "m1", qty: 1 }, { materialId: "m2", qty: 1 }] },
    { id: "p4", name: "Agenda artesanal A5", category: "agenda", kind: "fabricado", cost: 1350, price: 9000, stock: 6, minStock: 5, bom: [{ materialId: "m4", qty: 1 }, { materialId: "m5", qty: 100 }] },
    { id: "p5", name: "Figura dragón 12cm", category: "3d", kind: "fabricado", cost: 1760, price: 12000, stock: 4, minStock: 3, bom: [{ materialId: "f3", qty: 85 }, { materialId: "m3", qty: 1 }] },
  ],
  movements: [],
};

export const isLow = (x: { stock: number; minStock: number }) => x.stock <= x.minStock;

export function bomCost(p: Product, materials: Material[]) {
  return p.bom.reduce((s, l) => s + (materials.find((m) => m.id === l.materialId)?.unitCost ?? 0) * l.qty, 0);
}

/** Returns list of missing materials for producing qty units, empty if feasible. */
export function shortages(p: Product, qty: number, materials: Material[]) {
  return p.bom
    .map((l) => {
      const m = materials.find((x) => x.id === l.materialId);
      const need = l.qty * qty;
      return { name: m?.name ?? "?", need, have: m?.stock ?? 0 };
    })
    .filter((s) => s.need > s.have);
}

function consume(state: State, p: Product, qty: number): Material[] {
  return state.materials.map((m) => {
    const line = p.bom.find((l) => l.materialId === m.id);
    return line ? { ...m, stock: +(m.stock - line.qty * qty).toFixed(2) } : m;
  });
}

const log = (type: Movement["type"], detail: string): Movement => ({ id: uid(), date: new Date().toISOString(), type, detail });

/** Production: consumes BOM materials and adds finished units. */
export function produce(state: State, productId: string, qty: number): State {
  const p = state.products.find((x) => x.id === productId);
  if (!p || qty <= 0) throw new Error("Producto o cantidad inválida");
  if (shortages(p, qty, state.materials).length) throw new Error("Insumos insuficientes");
  return {
    materials: consume(state, p, qty),
    products: state.products.map((x) => (x.id === p.id ? { ...x, stock: x.stock + qty } : x)),
    movements: [log("produccion", `+${qty} × ${p.name}`), ...state.movements],
  };
}

/** Sale: deducts product stock; with madeToOrder, consumes BOM instead of finished stock. */
export function sell(state: State, productId: string, qty: number, madeToOrder = false): State {
  const p = state.products.find((x) => x.id === productId);
  if (!p || qty <= 0) throw new Error("Producto o cantidad inválida");
  if (madeToOrder) {
    if (shortages(p, qty, state.materials).length) throw new Error("Insumos insuficientes");
    return { ...state, materials: consume(state, p, qty), movements: [log("venta", `−${qty} × ${p.name} (bajo pedido)`), ...state.movements] };
  }
  if (p.stock < qty) throw new Error("Stock insuficiente");
  return {
    ...state,
    products: state.products.map((x) => (x.id === p.id ? { ...x, stock: x.stock - qty } : x)),
    movements: [log("venta", `−${qty} × ${p.name}`), ...state.movements],
  };
}

export type PrintInput = { grams: number; costPerKg: number; hours: number; watts: number; kwhPrice: number; wearPerHour: number; extras: number; margin: number };
export function printCost(i: PrintInput) {
  const material = (i.grams * i.costPerKg) / 1000;
  const energy = (i.watts / 1000) * i.hours * i.kwhPrice;
  const wear = i.wearPerHour * i.hours;
  const total = material + energy + wear + i.extras;
  return { material, energy, wear, total, price: priceFromMargin(total, i.margin) };
}
/** Margin is on sale price: price = cost / (1 - margin%). */
export function priceFromMargin(cost: number, marginPct: number) {
  return marginPct >= 100 ? Infinity : cost / (1 - marginPct / 100);
}
export const marginOf = (cost: number, price: number) => (price > 0 ? ((price - cost) / price) * 100 : 0);
/** CLP: no decimals, dot as thousands separator (e.g. $1.500). */
export const money = (n: number) => (isFinite(n) ? "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "—");

export type SaleLine = { productId: string; qty: number; madeToOrder?: boolean };
/** Multi-line sale: all-or-nothing (throws, leaving state untouched, if any line fails). */
export function sellMany(state: State, lines: SaleLine[]): State {
  if (!lines.length) throw new Error("La venta está vacía");
  return lines.reduce((s, l) => sell(s, l.productId, l.qty, l.madeToOrder), state);
}
/** Merge a line into a cart, summing qty for the same product + mode. */
export function addToCart(cart: SaleLine[], line: SaleLine): SaleLine[] {
  const i = cart.findIndex((c) => c.productId === line.productId && !!c.madeToOrder === !!line.madeToOrder);
  return i < 0 ? [...cart, line] : cart.map((c, j) => (j === i ? { ...c, qty: c.qty + line.qty } : c));
}
