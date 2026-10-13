import { useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Camera, ImageIcon } from 'lucide-react';
import { Btn, Modal } from './ui-kit';
import { LiveCamera } from './LiveCamera';
import { describeProductPhoto } from '@/lib/product-photo.functions';
import type { Category } from '@/lib/inventory';

export function ProductPhoto({onSuggestion, target = 'producto'}:{onSuggestion:(suggestion:{name:string;description:string;category:Category})=>void; target?:'producto'|'unitario'|'filamento'}) {
  const noun = target === 'producto' ? 'producto' : 'insumo';
  const galleryId = `new-${target}-gallery`;
  const [camera,setCamera]=useState(false);const [photo,setPhoto]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const input=useRef<HTMLInputElement>(null);const analyze=useServerFn(describeProductPhoto);
  async function select(file?:File){
    if(!file)return;setCamera(false);setError('');
    const url=URL.createObjectURL(file);
    try {const img=new Image();img.src=url;await img.decode();const k=Math.min(1,1280/Math.max(img.naturalWidth,img.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*k);canvas.height=Math.round(img.naturalHeight*k);const ctx=canvas.getContext('2d');if(!ctx)throw new Error();ctx.drawImage(img,0,0,canvas.width,canvas.height);setPhoto(canvas.toDataURL('image/jpeg',0.85));}catch{setError('No se pudo leer la foto. Usa JPG o PNG.');}finally{URL.revokeObjectURL(url);}
  }
  return <>
    <div className="grid grid-cols-2 gap-2"><Btn variant="ghost" onClick={()=>{setError('');setCamera(true);}}><Camera className="h-4 w-4"/>Tomar foto</Btn><Btn variant="ghost" onClick={()=>input.current?.click()}><ImageIcon className="h-4 w-4"/>Elegir imagen</Btn></div>
    <input id={galleryId} ref={input} type="file" accept="image/*" className="sr-only" aria-label={`Foto del nuevo ${noun}`} onChange={e=>{select(e.target.files?.[0]);e.target.value='';}}/>
    {!photo&&error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
    <LiveCamera open={camera} onClose={()=>setCamera(false)} galleryInputId={galleryId} onCapture={img=>{setCamera(false);setPhoto(img);}}/>
    <Modal open={!!photo} onClose={()=>{if(!busy)setPhoto('');}} title={`Confirmar foto del ${noun}`}>
      <img src={photo} alt={`Foto del ${noun}`} className="mb-4 max-h-64 w-full rounded-lg bg-secondary object-contain"/>
      {error&&<p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
      <div className="flex flex-col gap-2"><Btn variant="ghost" disabled={busy} onClick={()=>{setPhoto('');setError('');setCamera(true);}}>Repetir foto</Btn><Btn disabled={busy} onClick={async()=>{setBusy(true);setError('');try{const suggestion=await analyze({data:{image:photo,target}});onSuggestion(suggestion);setPhoto('');}catch(e){setError(e instanceof Error?e.message:'No se pudo analizar.');}finally{setBusy(false);}}}>{busy?'Analizando la foto…':'Usar esta foto'}</Btn></div>
    </Modal>
  </>;
}