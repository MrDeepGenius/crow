// ============================================
// COLLECTIONS - colecciones editoriales derivadas
// ============================================
// Sin almacenamiento propio: se calculan del catálogo real.
// Solo existe la colección si tiene productos (nada inventado).

import type { MarketplaceFormat, ProductPublication } from "./marketTypes";

export interface Collection {
  id: string;
  title: string;
  description: string;
  productIds: string[];
  accent: string;
}

export interface CreatorStat {
  creatorId: string;
  creatorName: string;
  products: ProductPublication[];
  sales: number;
  avgRating: number | null;
}

const STARTER: { format: MarketplaceFormat; label: string }[] = [
  { format: "course", label: "Curso" },
  { format: "ebook", label: "Ebook" },
  { format: "kit", label: "Kit de recursos" },
  { format: "interactive_web", label: "Web interactiva" },
];

export function computeCollections(published: ProductPublication[]): Collection[] {
  const out: Collection[] = [];
  const byFormat = (f: MarketplaceFormat): ProductPublication[] =>
    published.filter((p) => p.format === f);

  // "Empezá tu negocio digital": un producto de cada formato clave.
  const starter = STARTER.map(({ format }) => byFormat(format)[0]).filter(
    (p): p is ProductPublication => !!p
  );
  if (starter.length >= 3) {
    out.push({
      id: "negocio-digital",
      title: "Empezá tu negocio digital",
      description: "El stack completo: aprendé, publicá, equipate e interactuá.",
      productIds: starter.map((p) => p.id),
      accent: "#7c3aed",
    });
  }

  // Una colección por categoría con 2+ productos.
  const byCategory = new Map<string, ProductPublication[]>();
  for (const p of published) {
    const list = byCategory.get(p.category) ?? [];
    list.push(p);
    byCategory.set(p.category, list);
  }
  for (const [category, items] of byCategory) {
    if (items.length >= 2 && out.length < 6) {
      out.push({
        id: `cat-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        title: category,
        description: `${items.length} productos para dominar ${category.toLowerCase()}.`,
        productIds: items.map((p) => p.id),
        accent: "#a855f7",
      });
    }
  }
  return out;
}

export function computeCreators(
  published: ProductPublication[],
  salesOf: (productId: string) => number
): CreatorStat[] {
  const map = new Map<string, CreatorStat>();
  for (const p of published) {
    const entry = map.get(p.creatorId) ?? {
      creatorId: p.creatorId,
      creatorName: p.creatorName,
      products: [],
      sales: 0,
      avgRating: null,
    };
    entry.products.push(p);
    map.set(p.creatorId, entry);
  }
  return [...map.values()]
    .map((c) => {
      const sales = c.products.reduce((n, p) => n + salesOf(p.id), 0);
      const rated = c.products.filter((p) => p.ratingCount > 0);
      const avgRating =
        rated.length > 0 ? rated.reduce((n, p) => n + p.ratingSum / p.ratingCount, 0) / rated.length : null;
      return { ...c, sales, avgRating };
    })
    .sort((a, b) => b.products.length - a.products.length || b.sales - a.sales);
}
