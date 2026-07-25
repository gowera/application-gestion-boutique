import { Link } from "@tanstack/react-router";
import { ShoppingCart, MapPin, Phone, Mail, MessageCircle, Menu, X, Search, User } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import logo from "@/assets/brand/logo.png";

const NAV = [
  { to: "/boutique", label: "Boutique" },
  { to: "/services", label: "Services" },
  { to: "/devis", label: "Devis" },
  { to: "/contact", label: "Contact" },
];

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopBar />
      <MainNav />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

function TopBar() {
  return (
    <div className="hidden md:block bg-primary text-primary-foreground/80 text-[11px]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5">
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" />+243 996 886 079</span>
          <span className="flex items-center gap-1.5"><Mail className="h-3 w-3" />oredymusanda@gmail.com</span>
        </div>
        <a href="https://wa.me/243996886079" className="flex items-center gap-1.5 hover:text-primary-foreground">
          <MessageCircle className="h-3 w-3" /> WhatsApp Support
        </a>
      </div>
    </div>
  );
}

function MainNav() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  return (
    <nav className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={logo} alt="CONETEC" className="h-8 w-auto" />
          <span className="text-display text-lg font-extrabold tracking-tight text-primary">CONETEC</span>
        </Link>
        <div className="hidden lg:flex items-center gap-6 text-sm font-medium">
          {NAV.map((n) => (
            <Link
              key={n.label}
              to={n.to}
              className="text-foreground/70 transition-colors hover:text-primary"
              activeProps={{ className: "text-primary font-semibold border-b-2 border-energy pb-1" }}
            >
              {n.label}
            </Link>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" className="hidden sm:inline-flex text-foreground/70" aria-label="Rechercher">
            <Search className="h-5 w-5" />
          </Button>
          <Link to="/auth" className="hidden sm:inline-flex">
            <Button variant="ghost" size="icon" aria-label="Compte" className="text-foreground/70">
              <User className="h-5 w-5" />
            </Button>
          </Link>
          <Link to="/panier">
            <Button variant="ghost" size="icon" className="relative text-foreground/70" aria-label="Panier">
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-energy px-1 text-[10px] font-bold text-energy-foreground">
                  {count}
                </span>
              )}
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      {open && (
        <div className="lg:hidden border-t bg-background">
          <div className="flex flex-col px-4 py-3 gap-1">
            {NAV.map((n) => (
              <Link key={n.label} to={n.to} params={n.params as never} className="py-2 text-sm" onClick={() => setOpen(false)}>{n.label}</Link>
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
    <footer className="mt-20 bg-[#0a0a0a] text-neutral-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <img src={logo} alt="CONETEC" className="h-8 w-auto" />
            <span className="text-display text-lg font-extrabold text-white">CONETEC</span>
          </div>
          <p className="mt-4 text-sm text-neutral-400 leading-relaxed">
            Solutions techniques de pointe pour l'énergie solaire, la sécurité, les réseaux et l'infrastructure.
          </p>
        </div>
        <div>
          <h4 className="text-display text-sm font-bold uppercase tracking-wide text-energy mb-4">Navigation</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/boutique" className="hover:text-white">Catalogue</Link></li>
            <li><Link to="/services" className="hover:text-white">Nos services</Link></li>
            <li><Link to="/devis" className="hover:text-white">Demander un devis</Link></li>
            <li><Link to="/a-propos" className="hover:text-white">À propos</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-display text-sm font-bold uppercase tracking-wide text-energy mb-4">Ressources</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/services/$slug" params={{ slug: "solaire" }} className="hover:text-white">Guide installation solaire</Link></li>
            <li><Link to="/services/$slug" params={{ slug: "cctv" }} className="hover:text-white">Guide vidéosurveillance</Link></li>
            <li><Link to="/contact" className="hover:text-white">Support technique</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-display text-sm font-bold uppercase tracking-wide text-energy mb-4">Support direct</h4>
          <ul className="space-y-2.5 text-sm">
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-energy" /> +243 996 886 079</li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-energy" /> oredymusanda@gmail.com</li>
            <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-energy" /> WhatsApp Support</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-energy" /> Kinshasa, RDC</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 py-5 text-center text-xs text-neutral-500">
        © {new Date().getFullYear()} CONETEC. Expert-Grade Technical Solutions.
      </div>
    </footer>
  );
}
