import { describe, expect, it } from 'vitest';
import { applyMaterialPhoto } from '@/lib/material-photo';
import type { Material } from '@/lib/inventory';

describe('supply photo suggestions', () => {
  it('keeps the user stock and cost while suggesting editable metadata', () => {
    const material: Material = { id: 'm', name: '', kind: 'unitario', unit: 'u', stock: 17, minStock: 5, unitCost: 50 };
    const suggestion = { name: 'Argollas', description: 'Anillos metálicos.', stock: 99, unitCost: 999 };
    expect(applyMaterialPhoto(material, suggestion)).toEqual({ ...material, name: 'Argollas', description: 'Anillos metálicos.', stock: 17, unitCost: 50 });
  });
  it('keeps filament grams and bobbin details chosen by the user', () => {
    const material: Material = { id: 'f', name: '', kind: 'filamento', unit: 'g', stock: 640, totalG: 1000, minStock: 200, unitCost: 18, brand: 'eSun', material: 'PLA', color: 'Negro' };
    expect(applyMaterialPhoto(material, { name: 'Bobina negra', description: 'Filamento enrollado.' })).toEqual({ ...material, name: 'Bobina negra', description: 'Filamento enrollado.' });
  });
});