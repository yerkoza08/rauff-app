import { describe, it, expect } from "vitest";
import { seed, produce, sell, printCost, priceFromMargin, money } from "@/lib/inventory";

describe("inventory rules", () => {
  it("production consumes BOM and adds stock (llavero: 8g PLA, 1 argolla, 1 bolsa)", () => {
    const s = produce(seed, "p3", 2);
    expect(s.products.find((p) => p.id === "p3")!.stock).toBe(37);
    expect(s.materials.find((m) => m.id === "f1")!.stock).toBe(624);
    expect(s.materials.find((m) => m.id === "m1")!.stock).toBe(338);
    expect(s.materials.find((m) => m.id === "m2")!.stock).toBe(58);
  });
  it("sale deducts finished stock and rejects overselling", () => {
    expect(sell(seed, "p1", 4).products.find((p) => p.id === "p1")!.stock).toBe(20);
    expect(() => sell(seed, "p1", 99)).toThrow();
  });
  it("made-to-order sale consumes materials, not finished stock", () => {
    const s = sell(seed, "p3", 1, true);
    expect(s.products.find((p) => p.id === "p3")!.stock).toBe(35);
    expect(s.materials.find((m) => m.id === "m1")!.stock).toBe(339);
  });
  it("3D cost and margin pricing", () => {
    const r = printCost({ grams: 100, costPerKg: 20, hours: 2, watts: 100, kwhPrice: 0.5, wearPerHour: 0.1, extras: 0, margin: 50 });
    expect(r.total).toBeCloseTo(2.3);
    expect(r.price).toBeCloseTo(4.6);
    expect(priceFromMargin(6, 40)).toBeCloseTo(10);
  });
});

import { sellMany, addToCart } from "@/lib/inventory";
describe("multi-item sale", () => {
  it("deducts every line", () => {
    const s = sellMany(seed, [{ productId: "p1", qty: 2 }, { productId: "p3", qty: 3 }]);
    expect(s.products.find((p) => p.id === "p1")!.stock).toBe(22);
    expect(s.products.find((p) => p.id === "p3")!.stock).toBe(32);
  });
  it("fails whole sale if one line lacks stock", () => {
    expect(() => sellMany(seed, [{ productId: "p1", qty: 2 }, { productId: "p2", qty: 99 }])).toThrow();
  });
  it("merges same product in cart", () => {
    expect(addToCart([{ productId: "p1", qty: 2 }], { productId: "p1", qty: 3 })).toEqual([{ productId: "p1", qty: 5 }]);
  });
});

describe("CLP money format", () => {
  it("rounds to whole pesos with dot as thousands separator", () => {
    expect(money(1500)).toBe("$1.500");
    expect(money(15000)).toBe("$15.000");
    expect(money(1234567)).toBe("$1.234.567");
    expect(money(12.4)).toBe("$12");
  });
  it("seed prices are CLP-scale (no cents)", () => {
    expect(seed.products[0]!.price).toBe(16800);
    expect(seed.materials[0]!.unitCost).toBe(18); // $18 por gramo = $18.000/kg
  });
});
