/** Identité produit affichée sur toutes les cartes : Désignation, Marque, Modèle. */
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
  const model = sku?.trim() || (id ? id.slice(0, 8).toUpperCase() : "—");
  const rows = [
    { k: "Désignation", v: name },
    { k: "Marque", v: brand?.trim() || "CONETEC" },
    { k: "Modèle", v: model },
  ];
  return (
    <dl className={`space-y-0.5 text-[11px] leading-tight ${className}`}>
      {rows.map((r) => (
        <div key={r.k} className="flex min-w-0 gap-1.5">
          <dt className="shrink-0 font-semibold uppercase tracking-wide text-muted-foreground">{r.k} :</dt>
          <dd className="min-w-0 truncate font-medium text-foreground">{r.v}</dd>
        </div>
      ))}
    </dl>
  );
}
