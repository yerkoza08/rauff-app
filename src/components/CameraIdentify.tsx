import { useRef, useState } from "react";
import { Camera, ImageIcon } from "lucide-react";

const pickCls = "inline-flex cursor-pointer select-none items-center justify-center gap-1.5 rounded-lg border bg-background px-3 py-3 text-sm font-medium transition hover:bg-accent active:scale-[0.98] touch-manipulation";
import { Btn, Input, Modal, Select } from "@/components/ui-kit";
import { LiveCamera } from "@/components/LiveCamera";
import { identifyProduct } from "@/lib/identify.functions";
import type { Product, SaleLine } from "@/lib/inventory";

// Decode via <img> + object URL: works on all mobile browsers (createImageBitmap is missing/limited on older iOS Safari).
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Formato de imagen no compatible. Prueba con JPG o PNG.")); };
    img.src = url;
  });
}

async function toDataUrl(file: File, max = 1280): Promise<string> {
  const img = await loadImage(file);
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const k = Math.min(1, max / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * k));
  c.height = Math.max(1, Math.round(h * k));
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Tu navegador no pudo procesar la imagen.");
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

type Row = { include: boolean; productId: string; qty: number; confidence: number; description: string; options: string[] };

export function CameraIdentify({ products, onConfirm }: { products: Product[]; onConfirm: (lines: SaleLine[]) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [camOpen, setCamOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const close = () => { setPhoto(null); setRows(null); setError(null); setPending(null); setPickError(null); };
  const upd = (i: number, patch: Partial<Row>) => setRows((r) => r && r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const onFile = async (f?: File) => {
    if (!f) return;
    setCamOpen(false);
    setPickError(null);
    try {
      setPending(await toDataUrl(f));
    } catch (e) {
      setPickError((e as Error).message || "No se pudo leer la imagen.");
    }
  };

  const analyze = async (img: string) => {
    setPending(null);
    setError(null); setRows(null); setLoading(true); setPhoto(img);
    try {
      const r = await identifyProduct({ data: { image: img, catalog: products.map((p) => ({ id: p.id, name: p.name, category: p.category })) } });
      if (!r.ok) setError(r.error);
      else if (!r.suggestion.items.length) setError("No se detectaron artículos en la foto.");
      else
        setRows(r.suggestion.items.map((it) => ({
          include: !!it.productId,
          productId: it.productId ?? "",
          qty: it.quantity,
          confidence: it.confidence,
          description: it.description,
          options: [it.productId, ...it.alternatives].filter((x): x is string => !!x),
        })));
    } catch (e) {
      setError((e as Error).message || "No se pudo analizar la foto");
    } finally {
      setLoading(false);
    }
  };
  const chosen = rows?.filter((r) => r.include && r.productId && r.qty > 0) ?? [];

  return (
    <>
      <input id="gallery-input" ref={ref} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setCamOpen(true)} className={pickCls}><Camera className="h-4 w-4" />Tomar foto</button>
        <label htmlFor="gallery-input" role="button" tabIndex={0} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && ref.current?.click()} className={pickCls}><ImageIcon className="h-4 w-4" />Elegir imagen</label>
      </div>
      {pickError && <p className="mt-2 text-sm text-destructive">{pickError}</p>}
      <LiveCamera open={camOpen} onClose={() => setCamOpen(false)} galleryInputId="gallery-input" onCapture={(img) => { setCamOpen(false); setPending(img); }} />
      <Modal open={!!pending} onClose={() => setPending(null)} title="¿Es una buena foto?">
        {pending && <img src={pending} alt="Foto recién tomada" className="mb-4 max-h-64 w-full rounded-lg bg-secondary object-contain" />}
        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
        <p className="mb-4 text-sm text-muted-foreground">Revísala antes de analizar: si salió movida o cortada, tómala de nuevo.</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <button type="button" onClick={() => { setPending(null); setCamOpen(true); }} className={pickCls + " py-2 sm:order-1"}>
            Repetir foto
          </button>
          <Btn disabled={!pending} onClick={() => pending && analyze(pending)}>
            Usar esta foto
          </Btn>
        </div>
      </Modal>
      <Modal open={!!photo || loading} onClose={close} title="Artículos detectados">
        {photo && <img src={photo} alt="Foto capturada" className="mb-4 max-h-56 w-full rounded-lg bg-secondary object-contain" />}
        {loading && <p className="animate-pulse text-sm text-muted-foreground">Analizando la foto…</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {rows && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Revisa cada artículo: marca los que se venden, corrige el producto y la cantidad.</p>
            {rows.map((r, i) => {
              const stock = products.find((p) => p.id === r.productId)?.stock;
              return (
                <div key={i} className={`rounded-lg border p-3 ${r.include ? "border-primary bg-accent" : "opacity-70"}`}>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" className="mt-1" checked={r.include} disabled={!r.productId} onChange={(e) => upd(i, { include: e.target.checked })} aria-label={`Incluir ${r.description}`} />
                    <span className="flex-1">{r.description}{r.options.length > 0 && <span className="ml-1 text-xs text-muted-foreground">· {(r.confidence * 100).toFixed(0)}%</span>}</span>
                  </label>
                  <div className="mt-2 flex gap-2">
                    <Select value={r.productId} onChange={(e) => upd(i, { productId: e.target.value, include: !!e.target.value })} aria-label="Producto">
                      <option value="">— No está en catálogo —</option>
                      {r.options.length > 0 && <optgroup label="Sugeridos">{r.options.map((id) => <option key={id} value={id}>{products.find((p) => p.id === id)?.name}</option>)}</optgroup>}
                      <optgroup label="Todo el catálogo">{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>
                    </Select>
                    <Input type="number" min={1} className="w-20" value={r.qty} onChange={(e) => upd(i, { qty: Math.max(1, +e.target.value) })} aria-label="Cantidad" />
                  </div>
                  {r.productId && stock !== undefined && stock < r.qty && <p className="mt-1 text-xs text-destructive">Stock disponible: {stock}</p>}
                </div>
              );
            })}
            <div className="flex justify-between gap-2 pt-2">
              <button type="button" onClick={() => { close(); setCamOpen(true); }} className={pickCls + " py-2"}>Otra foto</button>
              <Btn disabled={!chosen.length} onClick={() => { onConfirm(chosen.map((r) => ({ productId: r.productId, qty: r.qty }))); close(); }}>Agregar {chosen.length} a la venta</Btn>
            </div>
          </div>
        )}
        {error && <div className="mt-3 flex justify-end"><button type="button" onClick={() => { close(); setCamOpen(true); }} className={pickCls + " py-2"}>Intentar otra foto</button></div>}
      </Modal>
    </>
  );
}
