import { useEffect, useRef, useState } from "react";
import { Camera, ImageIcon, X } from "lucide-react";

/** Full-screen live camera using getUserMedia; falls back to a file picker when unavailable or denied. */
export function LiveCamera({ open, onClose, onCapture, galleryInputId }: { open: boolean; onClose: () => void; onCapture: (dataUrl: string) => void; galleryInputId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setReady(false);
    const stop = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
    (async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError("Este navegador no permite abrir la cámara aquí. Usa la opción de subir imagen.");
        return;
      }
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
        } catch (e) {
          if ((e as DOMException).name === "OverconstrainedError") stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          else throw e;
        }
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          v.setAttribute("playsinline", "true"); // iOS Safari
          v.muted = true;
          await v.play().catch(() => {});
        }
      } catch (e) {
        const name = (e as DOMException).name;
        setError(
          name === "NotAllowedError" || name === "SecurityError"
            ? "Permiso de cámara denegado. Actívalo en los ajustes del navegador o sube una imagen."
            : name === "NotFoundError"
              ? "No se encontró ninguna cámara en este dispositivo."
              : "No se pudo abrir la cámara. Sube una imagen en su lugar.",
        );
      }
    })();
    return () => { cancelled = true; stop(); };
  }, [open]);

  const capture = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const max = 1280;
    const k = Math.min(1, max / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(v.videoWidth * k);
    c.height = Math.round(v.videoHeight * k);
    c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
    onCapture(c.toDataURL("image/jpeg", 0.85));
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-foreground">
      <div className="flex items-center justify-between p-3 text-background">
        <span className="font-display font-bold">Cámara</span>
        <button onClick={onClose} aria-label="Cerrar cámara" className="rounded-full p-2 hover:bg-background/10"><X className="h-6 w-6" /></button>
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {error ? (
          <div className="max-w-sm p-6 text-center text-background">
            <p className="mb-4 text-sm">{error}</p>
            <label htmlFor={galleryInputId} className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"><ImageIcon className="h-4 w-4" />Subir o tomar imagen</label>
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted onLoadedMetadata={() => setReady(true)} className="h-full w-full object-contain" />
            {!ready && <p className="absolute text-sm text-background/80">Abriendo cámara…</p>}
          </>
        )}
      </div>
      {!error && (
        <div className="flex items-center justify-between gap-4 p-5 pb-8">
          <label htmlFor={galleryInputId} className="flex cursor-pointer items-center gap-2 rounded-full px-4 py-3 text-sm font-medium text-background hover:bg-background/10" aria-label="Subir desde galería"><ImageIcon className="h-5 w-5" />Subir desde galería</label>
          <button onClick={capture} disabled={!ready} aria-label="Capturar foto" className="flex h-18 w-18 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground disabled:opacity-50" style={{ width: 72, height: 72 }}>
            <Camera className="h-7 w-7" />
          </button>
          <span className="w-32" />
        </div>
      )}
      {!error && <p className="pb-4 text-center text-xs text-background/70">Capturar foto</p>}
    </div>
  );
}
