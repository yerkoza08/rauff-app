import { describe,it,expect } from 'vitest';
import { allowed,canManage,type Access } from '@/lib/permissions';
const seller:Access={role:'vendedor',active:true,sales:true,costs:false,inventory:false};
describe('Permisos del equipo',()=>{
  it('solo registrar ventas no permite ver costos ni editar inventario',()=>{expect(allowed(seller,'sales')).toBe(true);expect(allowed(seller,'costs')).toBe(false);expect(allowed(seller,'inventory')).toBe(false);expect(canManage(seller)).toBe(false);});
  it('permite asignar costos e inventario independientemente',()=>{expect(allowed({...seller,costs:true},'costs')).toBe(true);expect(allowed({...seller,costs:true},'inventory')).toBe(false);expect(allowed({...seller,inventory:true},'inventory')).toBe(true);});
  it('administrador tiene acceso total',()=>{const a={...seller,role:'admin'};expect(allowed(a,'sales')).toBe(true);expect(allowed(a,'costs')).toBe(true);expect(allowed(a,'inventory')).toBe(true);expect(canManage(a)).toBe(true);});
  it('suspendido no tiene acceso aunque sea administrador',()=>{const a={...seller,role:'admin',active:false};expect(allowed(a,'sales')).toBe(false);expect(allowed(a,'costs')).toBe(false);expect(allowed(a,'inventory')).toBe(false);expect(canManage(a)).toBe(false);});
});