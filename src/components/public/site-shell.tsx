import { Link } from "@tanstack/react-router";
import { Zap, ShoppingCart, MapPin, Phone, Mail, MessageCircle, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import logo from "@/assets/brand/logo.png";

const NAV = [
  { to: "/", label: "Accueil" },
  { to: "/boutique", label: "Boutique" },
  { to: "/services", label: "Services" },
  { to: "/devis", label: "Devis" },
  { to: "/a-propos", label: "À propos" },
  { to: "/contact", label: "Contact" },
];

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopBar />
      <MainNav />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

function TopBar() {
  return (
    <div className="hidden md:block bg-primary text-primary-foreground/80 text-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><Phone className="h-3 w-3" />+243 996 886 079</span>
          <span className="flex items-center gap-1"><Mail className="h-3 w-3" />oredymusanda@gmail.com</span>
        </div>
        <a href="https://wa.me/243996886079" className="flex items-center gap-1 hover:text-primary-foreground">
          <MessageCircle className="h-3 w-3" /> WhatsApp
        </a>
      </div>
    </div>
  );
}

function MainNav() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  return (
    <nav className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="CONETEC" className="h-10 w-auto" />
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="text-foreground/70 hover:text-primary transition-colors" activeProps={{ className: "text-primary font-semibold" }}>
              {n.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link to="/panier">
            <Button variant="outline" size="sm" className="relative">
              <ShoppingCart className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Panier</span>
              {count > 0 && (
                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-energy text-[10px] font-bold text-energy-foreground">
                  {count}
                </span>
              )}
            </Button>
          </Link>
          <Link to="/auth" className="hidden sm:inline-block"><Button size="sm">Connexion</Button></Link>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t bg-background">
          <div className="flex flex-col px-4 py-3 gap-2">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="py-2 text-sm" onClick={() => setOpen(false)}>{n.label}</Link>
            ))}
            <Link to="/auth" className="py-2 text-sm" onClick={() => setOpen(false)}>Connexion</Link>
          </div>
        </div>
      )}
    </nav>
  );
}

function SiteFooter() {
  return (
    <footer className="bg-primary text-primary-foreground/80 mt-16">
      <div className="mx-auto max-w-7xl px-4 py-12 grid gap-8 md:grid-cols-4">
        <div>
          <img src={logo} alt="CONETEC" className="h-12 w-auto bg-white/10 rounded-md p-1" />
          <p className="mt-4 text-sm">Company of New Technology — Vente, installation et maintenance de solutions techniques.</p>
        </div>
        <div>
          <h4 className="text-primary-foreground font-semibold mb-3">Navigation</h4>
          <ul className="space-y-2 text-sm">
            {NAV.map((n) => <li key={n.to}><Link to={n.to} className="hover:text-primary-foreground">{n.label}</Link></li>)}
          </ul>
        </div>
        <div>
          <h4 className="text-primary-foreground font-semibold mb-3">Services</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/services/$slug" params={{ slug: "electricite" }} className="hover:text-primary-foreground">Électricité</Link></li>
            <li><Link to="/services/$slug" params={{ slug: "solaire" }} className="hover:text-primary-foreground">Énergie solaire</Link></li>
            <li><Link to="/services/$slug" params={{ slug: "cctv" }} className="hover:text-primary-foreground">Vidéosurveillance</Link></li>
            <li><Link to="/services/$slug" params={{ slug: "reseaux" }} className="hover:text-primary-foreground">Réseaux</Link></li>
            <li><Link to="/services/$slug" params={{ slug: "climatisation" }} className="hover:text-primary-foreground">Climatisation</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-primary-foreground font-semibold mb-3">Contact</h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><Phone className="h-3 w-3" /> +243 996 886 079</li>
            <li className="flex items-center gap-2"><Mail className="h-3 w-3" /> oredymusanda@gmail.com</li>
            <li className="flex items-center gap-2"><MessageCircle className="h-3 w-3" /> WhatsApp</li>
            <li className="flex items-center gap-2"><MapPin className="h-3 w-3" /> RDC</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10 py-4 text-center text-xs">
        © {new Date().getFullYear()} CONETEC. Développé par OREDY TECHNOLOGIES.
      </div>
    </footer>
  );
}
