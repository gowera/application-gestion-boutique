/** Identité produit affichée sur toutes les cartes : nom, marque et modèle, empilés sans libellés. */
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
  const secondary = [brand?.trim() || "Ma boutique", model].filter(Boolean);
  return (
    <div className={`leading-tight text-foreground ${className}`}>
      <span className="block text-sm font-bold line-clamp-2 sm:text-base">{name}</span>
      {secondary.map((line) => (
        <span key={line} className="block truncate text-xs font-semibold text-muted-foreground sm:text-sm">
          {line}
        </span>
      ))}
    </div>
  );
}
