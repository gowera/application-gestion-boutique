import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/public/site-shell";
import { StorageImage } from "@/components/storage-image";
import { Button } from "@/components/ui/button";
import { usePublicTeam, type TeamMember } from "@/lib/team";
import { resolveImageUrl } from "@/lib/storage";
import { FileText, Mail, Phone, User, Users } from "lucide-react";

export const Route = createFileRoute("/equipe")({
  component: TeamPage,
  head: () => ({
    meta: [
      { title: "Notre équipe — CONETEC" },
      { name: "description", content: "Rencontrez les ingénieurs et techniciens CONETEC : électricité, solaire, sécurité, réseaux, froid et climatisation. Parcours, rôles et CV de nos experts." },
      { property: "og:title", content: "Notre équipe — CONETEC" },
      { property: "og:description", content: "Les experts CONETEC : ingénieurs et techniciens en électricité, énergie solaire, sécurité et réseaux." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/equipe" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/equipe" }],
  }),
});

async function openFile(url: string) {
  const resolved = (await resolveImageUrl(url)) || url;
  window.open(resolved, "_blank", "noopener");
}

function TeamCard({ m }: { m: TeamMember }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-l-4 border-l-energy border-border/60 bg-background shadow-sm transition-all hover:shadow-lg">
      <div className="aspect-[4/3] overflow-hidden bg-secondary">
        <StorageImage
          src={m.photo_url ?? undefined}
          alt={m.name}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          fallback={<div className="grid h-full w-full place-items-center"><User className="h-16 w-16 text-muted-foreground/30" /></div>}
        />
      </div>
      <div className="p-5">
        <h2 className="text-display text-base font-bold">{m.name}</h2>
        <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-energy">{m.role || "Équipe CONETEC"}</p>
        {m.bio && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{m.bio}</p>}
        <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
          {m.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-primary" /><a href={`mailto:${m.email}`} className="hover:text-primary">{m.email}</a></p>}
          {m.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-primary" /><a href={`tel:${m.phone}`} className="hover:text-primary">{m.phone}</a></p>}
        </div>
        {m.cv_url && (
          <Button variant="outline" size="sm" className="mt-4 w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground" onClick={() => openFile(m.cv_url!)}>
            <FileText className="mr-2 h-4 w-4" /> Consulter le CV
          </Button>
        )}
      </div>
    </article>
  );
}

function TeamPage() {
  const { data: team, isLoading } = usePublicTeam();
  return (
    <SiteShell>
      <section className="border-b bg-gradient-to-br from-primary via-primary to-primary/85 py-12 text-primary-foreground sm:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-energy px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-energy-foreground">
            <Users className="h-3.5 w-3.5" /> Notre équipe
          </span>
          <h1 className="mt-4 text-display text-3xl font-extrabold sm:text-4xl">Les experts derrière CONETEC</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-primary-foreground/85">
            Ingénieurs, techniciens et conseillers : une équipe pluridisciplinaire en électricité, énergie solaire,
            sécurité, réseaux, froid et climatisation, au service de vos installations.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border bg-background p-4">
                <div className="aspect-[4/3] rounded-lg bg-muted" />
                <div className="mt-4 h-4 w-2/3 rounded bg-muted" />
                <div className="mt-2 h-3 w-1/3 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : !team?.length ? (
          <div className="rounded-2xl border bg-background p-16 text-center text-muted-foreground">
            L'équipe sera présentée très prochainement.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((m) => <TeamCard key={m.id} m={m} />)}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
