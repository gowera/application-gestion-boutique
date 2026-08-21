import { Link } from "@tanstack/react-router";
import { ShoppingCart, MapPin, Phone, Mail, MessageCircle, Menu, X, Search, User } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { useSettings } from "@/lib/currency";
import { StorageImage } from "@/components/storage-image";
import { SocialLinks } from "@/components/public/social-links";
import { SiteMap, useMapConfig } from "@/components/public/site-map";
import logo from "@/assets/brand/logo.png";
import { useCurrentUser } from "@/hooks/use-auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, LayoutDashboard } from "lucide-react";
import { useHasRole } from "@/hooks/use-auth";
import { STAFF_ROLES } from "@/lib/permissions";

function AccountButton() {
  const { user } = useCurrentUser();
  const isStaff = useHasRole(STAFF_ROLES);
  const navigate = useNavigate();
  const qc = useQueryClient();

  if (!user) {
    return (
      <Link to="/auth" className="hidden sm:inline-flex">
        <Button variant="ghost" size="sm" className="gap-2 text-foreground/70" aria-label="Se connecter">
          <User className="h-5 w-5" /><span className="hidden md:inline">Connexion</span>
        </Button>
      </Link>
    );
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const initial = (user.email ?? "?").slice(0, 1).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2" aria-label="Mon compte">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">{initial}</span>
          <span className="hidden md:inline max-w-[140px] truncate text-sm">{user.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">Connecté · {user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link to="/mon-compte"><User className="mr-2 h-4 w-4" />Mon compte</Link></DropdownMenuItem>
        {isStaff && (
          <DropdownMenuItem asChild><Link to="/admin"><LayoutDashboard className="mr-2 h-4 w-4" />Tableau de bord</Link></DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Se déconnecter</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const NAV = [
  { to: "/boutique", label: "Boutique" },
  { to: "/services", label: "Services" },
  { to: "/equipe", label: "Notre équipe" },
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
  const { data: s } = useSettings();
  const phone = s?.phone || "+243 996 886 079";
  const email = s?.email || "oredymusanda@gmail.com";
  const wa = (s?.whatsapp || phone).replace(/\D/g, "");
  return (
    <div className="hidden md:block bg-primary text-primary-foreground/80 text-[11px]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5">
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{phone}</span>
          <span className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{email}</span>
        </div>
        <div className="flex items-center gap-4">
          <SocialLinks place="header" />
          <a href={`https://wa.me/${wa}`} className="flex items-center gap-1.5 hover:text-primary-foreground">
            <MessageCircle className="h-3 w-3" /> WhatsApp Support
          </a>
        </div>
      </div>
    </div>
  );
}

function MainNav() {
  const { count } = useCart();
  const { data: s } = useSettings();
  const [open, setOpen] = useState(false);
  const brand = s?.shop_name || "CONETEC";
  const logoUrl = s?.logo_url || logo;
  return (
    <nav className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <StorageImage
            src={logoUrl}
            alt={brand}
            className="h-9 w-auto"
            fallback={<img src={logo} alt={brand} className="h-9 w-auto" />}
          />
          <span className="text-display text-lg font-extrabold tracking-tight text-primary">{brand}</span>
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
          <AccountButton />

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
              <Link key={n.label} to={n.to} className="py-2 text-sm" onClick={() => setOpen(false)}>{n.label}</Link>
            ))}
            <Link to="/mon-compte" className="py-2 text-sm" onClick={() => setOpen(false)}>Mon compte</Link>
          </div>
        </div>
      )}
    </nav>
  );
}

function SiteFooter() {
  const { data: s } = useSettings();
  const brand = s?.shop_name || "CONETEC";
  const logoUrl = s?.logo_url || logo;
  const phone = s?.phone || "+243 996 886 079";
  const email = s?.email || "oredymusanda@gmail.com";
  const address = s?.address || "République Démocratique du Congo";
  const wa = (s?.whatsapp || phone).replace(/\D/g, "");
  const { link: mapLink } = useMapConfig();

  return (
    <footer className="mt-20 bg-[#0a0a0a] text-neutral-300">
      <div className="border-b border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-3 px-4 py-6">
          <SocialLinks place="footer" className="justify-center text-neutral-300 [&_a]:hover:text-energy" />
          <p className="text-xs uppercase tracking-widest text-neutral-500">Suivez {brand}</p>
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <StorageImage
              src={logoUrl}
              alt={brand}
              className="h-9 w-auto"
              fallback={<img src={logo} alt={brand} className="h-9 w-auto" />}
            />
            <span className="text-display text-lg font-extrabold text-white">{brand}</span>
          </div>
          <p className="mt-4 text-sm text-neutral-400 leading-relaxed">
            Solutions techniques de pointe pour l'énergie solaire, la sécurité, les réseaux et l'infrastructure.
          </p>
        </div>

        <div>
          <h4 className="text-display text-sm font-bold uppercase tracking-wide text-energy mb-4">Navigation</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/boutique" className="hover:text-white">Boutique</Link></li>
            <li><Link to="/services" className="hover:text-white">Nos services</Link></li>
            <li><Link to="/equipe" className="hover:text-white">Notre équipe</Link></li>
            <li><Link to="/devis" className="hover:text-white">Demander un devis</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-display text-sm font-bold uppercase tracking-wide text-energy mb-4">Ressources</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/a-propos" className="hover:text-white">À propos</Link></li>
            <li><Link to="/services" className="hover:text-white">Catalogue de services</Link></li>
            <li><Link to="/contact" className="hover:text-white">Support technique</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-display text-sm font-bold uppercase tracking-wide text-energy mb-4">Support direct</h4>
          <ul className="space-y-2.5 text-sm">
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-energy" /> {phone}</li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-energy" /> {email}</li>
            <li>
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white">
                <MessageCircle className="h-4 w-4 text-energy" /> WhatsApp Support
              </a>
            </li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-energy" /> {address}</li>
          </ul>
          <div className="mt-4">
            <SiteMap height={160} className="border-white/10" />
            <a href={mapLink} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 text-xs text-energy hover:underline">
              <MapPin className="h-3.5 w-3.5" /> Voir sur Google Maps
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/5 py-5 text-center text-xs text-neutral-500">
        © {new Date().getFullYear()} {brand}. Expert-Grade Technical Solutions.
      </div>
    </footer>
  );
}

