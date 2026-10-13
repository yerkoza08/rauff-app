import type { Material } from './inventory';

/** A photo can suggest metadata, never quantities or costs. */
export function applyMaterialPhoto(material: Material, suggestion: { name: string; description: string }): Material {
  return { ...material, name: suggestion.name, description: suggestion.description };
}