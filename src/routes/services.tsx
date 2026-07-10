import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/public/site-shell";
import { Card, CardContent } from "@/components/ui/card";
import { SERVICES } from "./index";

export const Route = createFileRoute("/services")({ component: ServicesIndex });

function ServicesIndex() {
  return (
    <SiteShell>
      <div className="bg-hero-gradient text-primary-foreground py-12">
        <div className="mx-auto max-w-7xl px-4">
          <h1 className="text-display text-3xl md:text-5xl font-bold">Nos services techniques</h1>
          <p className="mt-2 text-primary-foreground/80">Installation, maintenance et fourniture d'équipements.</p>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((s) => (
          <Link key={s.slug} to="/services/$slug" params={{ slug: s.slug }}>
            <Card className="group h-full overflow-hidden hover:shadow-lg hover:border-primary/40 transition-all">
              <div className="aspect-video overflow-hidden bg-secondary"><img src={s.img} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /></div>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><s.icon className="h-5 w-5" /></div>
                  <h3 className="text-display font-semibold">{s.title}</h3>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </SiteShell>
  );
}
