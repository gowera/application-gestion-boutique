/** Identité produit affichée sur toutes les cartes : nom, marque et modèle, sans libellés. */
export function ProductIdentity({
  name,
  brand,
  sku,
  id,
  className = "",
}: {
  name: string;
  brand?: string | null;
  sku?: string | null;
  id?: string;
  className?: string;
}) {
  const model = sku?.trim() || (id ? id.slice(0, 8).toUpperCase() : "");
  const parts = [name, brand?.trim() || "CONETEC", model].filter(Boolean);
  return (
    <p className={`text-sm font-bold leading-snug text-foreground line-clamp-2 sm:text-base ${className}`}>
      {parts.join(", ")}
    </p>
  );
}
