import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Star, MessageSquarePlus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export type ReviewStats = { count: number; average: number };

export function useProductReviews(productId: string) {
  return useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_reviews")
        .select("id,author_name,rating,comment,created_at")
        .eq("product_id", productId)
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
}

export function reviewStats(reviews: { rating: number }[] | undefined): ReviewStats {
  if (!reviews?.length) return { count: 0, average: 0 };
  const sum = reviews.reduce((a, r) => a + Number(r.rating), 0);
  return { count: reviews.length, average: Math.round((sum / reviews.length) * 10) / 10 };
}

export function Stars({ value, className = "h-4 w-4" }: { value: number; className?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${className} ${i <= Math.round(value) ? "fill-energy text-energy" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

export function ProductReviews({ productId }: { productId: string }) {
  const qc = useQueryClient();
  const { data: reviews, isLoading } = useProductReviews(productId);
  const stats = useMemo(() => reviewStats(reviews), [reviews]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("product_reviews").insert({
        product_id: productId,
        author_name: name.trim(),
        rating,
        comment: comment.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Merci ! Votre avis a été publié.");
      setName(""); setComment(""); setRating(5); setOpen(false);
      qc.invalidateQueries({ queryKey: ["product-reviews", productId] });
    },
    onError: () => toast.error("Impossible d'enregistrer votre avis."),
  });

  const buckets = [5, 4, 3, 2, 1].map((r) => ({
    r,
    n: (reviews ?? []).filter((x) => Number(x.rating) === r).length,
  }));

  return (
    <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* Summary */}
      <div className="rounded-2xl border-l-4 border-l-energy bg-secondary/40 p-6">
        <div className="text-display text-5xl font-extrabold text-primary">
          {stats.count ? stats.average.toFixed(1) : "—"}
          <span className="text-lg font-bold text-muted-foreground">/5</span>
        </div>
        <div className="mt-2"><Stars value={stats.average} className="h-5 w-5" /></div>
        <p className="mt-1 text-xs text-muted-foreground">
          {stats.count ? `${stats.count} avis client${stats.count > 1 ? "s" : ""} vérifié${stats.count > 1 ? "s" : ""}` : "Aucun avis pour le moment"}
        </p>
        <div className="mt-4 space-y-1.5">
          {buckets.map((b) => (
            <div key={b.r} className="flex items-center gap-2 text-xs">
              <span className="w-3 text-muted-foreground">{b.r}</span>
              <Star className="h-3 w-3 fill-energy text-energy" />
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-energy" style={{ width: `${stats.count ? (b.n / stats.count) * 100 : 0}%` }} />
              </div>
              <span className="w-5 text-right text-muted-foreground">{b.n}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-energy" /> Avis de clients Gestion Stock
        </p>
        <Button className="mt-4 w-full bg-energy text-energy-foreground hover:bg-energy/90" onClick={() => setOpen((v) => !v)}>
          <MessageSquarePlus className="mr-2 h-4 w-4" /> Laisser un avis
        </Button>
      </div>

      {/* List + form */}
      <div>
        {open && (
          <form
            className="mb-6 space-y-3 rounded-2xl border bg-background p-5"
            onSubmit={(e) => { e.preventDefault(); if (name.trim().length < 2) { toast.error("Indiquez votre nom."); return; } submit.mutate(); }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="Votre nom" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Note :</span>
                {[1, 2, 3, 4, 5].map((i) => (
                  <button key={i} type="button" onClick={() => setRating(i)} aria-label={`${i} étoiles`}>
                    <Star className={`h-6 w-6 transition-transform hover:scale-110 ${i <= rating ? "fill-energy text-energy" : "text-muted-foreground/30"}`} />
                  </button>
                ))}
              </div>
            </div>
            <Textarea placeholder="Partagez votre expérience avec ce produit…" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} rows={4} />
            <div className="flex gap-2">
              <Button type="submit" disabled={submit.isPending}>{submit.isPending ? "Envoi…" : "Publier mon avis"}</Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            </div>
          </form>
        )}

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Chargement des avis…</div>
        ) : !reviews?.length ? (
          <div className="rounded-2xl border border-dashed bg-background p-10 text-center text-sm text-muted-foreground">
            Soyez le premier à donner votre avis sur ce produit.
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-2xl border bg-background p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {r.author_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{r.author_name}</div>
                      <Stars value={Number(r.rating)} className="h-3.5 w-3.5" />
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
                {r.comment && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/80">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
