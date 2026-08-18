import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSettings, type Currency } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { StorageImage } from "@/components/storage-image";
import { parseMapsLink } from "@/components/public/site-map";
import { setAdminSettings } from "@/lib/local/adapter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "@/components/ui/dialog";
import EditorCanvas from "@/components/documents/editor-canvas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { MENU_ITEMS, DEFAULT_ROLE_MENUS, ROLE_LABELS, STAFF_ROLES, type AppRole } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/admin/settings")({ component: Page });

type TabId =
  | "boutique" | "compte" | "utilisateurs" | "acces" | "paiements" | "livraison"
  | "stocks" | "facturation" | "materiel" | "boutiqueEnLigne" | "notifications"
  | "fidelite" | "securite" | "integrations" | "preferences" | "donnees" | "apropos";

const TABS: [TabId, string][] = [
  ["boutique", "Boutique"], ["compte", "Compte"], ["utilisateurs", "Utilisateurs"], ["acces", "Accès & rôles"],
  ["paiements", "Paiements"], ["livraison", "Livraison"], ["stocks", "Stocks"],
  ["facturation", "Facturation"], ["materiel", "Matériel"],
  ["boutiqueEnLigne", "Boutique en ligne"], ["notifications", "Notifications"],
  ["fidelite", "Fidélité"], ["securite", "Sécurité"], ["integrations", "Intégrations"],
  ["preferences", "Préférences"], ["donnees", "Données"], ["apropos", "À propos"],
];

type Extras = Record<string, unknown>;

function Page() {
  const { data } = useSettings();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>("boutique");

  const [core, setCore] = useState({
    shop_name: "",
    address: "",
    phone: "",
    whatsapp: "",
    email: "",
    primary_currency: "USD" as Currency,
    usd_to_cdf_rate: 2800,
    low_stock_threshold: 5,
    invoice_prefix: "CNT",
    logo_url: "",
    legal_mentions: "",
    document_theme_color: "#0b1e3f",
    map_lat: "",
    map_lng: "",
    trash_retention_days: 30,
  });
  const [extras, setExtras] = useState<Extras>({});

  useEffect(() => {
    if (!data) return;
    const d = data as unknown as Record<string, any>;
    setCore({
      shop_name: d.shop_name ?? "",
      address: d.address ?? "",
      phone: d.phone ?? "",
      whatsapp: d.whatsapp ?? "",
      email: d.email ?? "",
      primary_currency: (d.primary_currency ?? "USD") as Currency,
      usd_to_cdf_rate: Number(d.usd_to_cdf_rate ?? 2800),
      low_stock_threshold: Number(d.low_stock_threshold ?? 5),
      invoice_prefix: d.invoice_prefix ?? "CNT",
      logo_url: d.logo_url ?? "",
      legal_mentions: d.legal_mentions ?? "",
      document_theme_color: d.document_theme_color ?? "#0b1e3f",
      map_lat: d.map_lat != null ? String(d.map_lat) : "",
      map_lng: d.map_lng != null ? String(d.map_lng) : "",
      trash_retention_days: Number(d.trash_retention_days ?? 30),
    });
    setExtras((d.extras && typeof d.extras === "object" ? d.extras : {}) as Extras);
  }, [data]);

  const ex = <T,>(k: string, def: T): T => (extras[k] === undefined || extras[k] === null ? def : (extras[k] as T));
  const setEx = (k: string, v: unknown) => setExtras((e) => ({ ...e, [k]: v }));

  async function uploadTo(field: "logo_url" | string, file: File, extrasField = false) {
    const path = `site-assets/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true, contentType: file.type || "image/png" });
    if (error) { toast.error(error.message); return; }
    const url = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    if (extrasField) setEx(field, url); else setCore((c) => ({ ...c, [field]: url } as typeof c));
    toast.success("Fichier téléversé");
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        shop_name: core.shop_name,
        address: core.address || null,
        phone: core.phone || null,
        whatsapp: core.whatsapp || null,
        email: core.email || null,
        primary_currency: core.primary_currency,
        usd_to_cdf_rate: core.usd_to_cdf_rate,
        low_stock_threshold: core.low_stock_threshold,
        invoice_prefix: core.invoice_prefix,
        logo_url: core.logo_url || null,
        legal_mentions: core.legal_mentions || null,
        document_theme_color: core.document_theme_color || null,
        map_lat: core.map_lat ? Number(core.map_lat) : null,
        map_lng: core.map_lng ? Number(core.map_lng) : null,
        trash_retention_days: core.trash_retention_days,
        extras,
      };
      await setAdminSettings(payload);
    },
    onSuccess: () => { toast.success("Paramètres enregistrés"); qc.invalidateQueries({ queryKey: ["settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const jsonExport = useMemo(() => JSON.stringify(data ?? {}, null, 2), [data]);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display text-2xl font-bold">Paramètres</h1>
          <p className="text-sm text-muted-foreground">Toutes les configurations de l'application, centralisées et sauvegardées.</p>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Enregistrement…" : "Enregistrer"}</Button>
      </div>

      <Card><CardContent className="p-2 flex flex-wrap gap-2">
        {TABS.map(([value, label]) => (
          <Button key={value} variant={tab === value ? "default" : "outline"} size="sm" onClick={() => setTab(value)}>{label}</Button>
        ))}
      </CardContent></Card>

      <Card><CardContent className="p-6 space-y-4">

        {tab === "boutique" && <>
          <div><Label>Nom de la boutique</Label><Input value={core.shop_name} onChange={(e) => setCore({ ...core, shop_name: e.target.value })} /></div>
          <div><Label>Description</Label><Textarea rows={3} value={ex("description", "")} onChange={(e) => setEx("description", e.target.value)} /></div>
          <div className="grid gap-4 md:grid-cols-3">
            <div><Label>Logo</Label>
              {core.logo_url && <StorageImage src={core.logo_url} alt="logo" className="mb-2 h-14 w-14 rounded object-contain bg-muted" />}
              <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadTo("logo_url", f); }} />
            </div>
            <div><Label>Favicon</Label>
              {ex("favicon_url", "") && <StorageImage src={ex("favicon_url", "")} alt="favicon" className="mb-2 h-8 w-8 rounded object-contain bg-muted" />}
              <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadTo("favicon_url", f, true); }} />
            </div>
            <div><Label>Bannière</Label>
              {ex("banner_url", "") && <StorageImage src={ex("banner_url", "")} alt="banner" className="mb-2 h-14 w-24 rounded object-cover bg-muted" />}
              <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadTo("banner_url", f, true); }} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div><Label>Téléphone</Label><Input value={core.phone} onChange={(e) => setCore({ ...core, phone: e.target.value })} /></div>
            <div><Label>WhatsApp</Label><Input value={core.whatsapp} onChange={(e) => setCore({ ...core, whatsapp: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={core.email} onChange={(e) => setCore({ ...core, email: e.target.value })} /></div>
          </div>
          <div><Label>Adresse physique</Label><Input value={core.address} onChange={(e) => setCore({ ...core, address: e.target.value })} /></div>
          <div>
            <Label>Lien Google Maps</Label>
            <Input
              value={ex("map_url", "")}
              onChange={(e) => {
                const url = e.target.value;
                setEx("map_url", url);
                const c = parseMapsLink(url);
                if (c) setCore((prev) => ({ ...prev, map_lat: String(c.lat), map_lng: String(c.lng) }));
              }}
              placeholder="https://www.google.com/maps/place/…"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Collez le lien de votre emplacement Google Maps. La carte du site l'utilisera après enregistrement.
              {parseMapsLink(ex("map_url", "")) ? " ✓ Coordonnées détectées." : ex("map_url", "") ? " ⚠ Lien court non reconnu — utilisez le lien complet (avec @latitude,longitude)." : ""}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Facebook</Label><Input value={ex("social_facebook", "")} onChange={(e) => setEx("social_facebook", e.target.value)} placeholder="https://facebook.com/…" /></div>
            <div><Label>Instagram</Label><Input value={ex("social_instagram", "")} onChange={(e) => setEx("social_instagram", e.target.value)} placeholder="https://instagram.com/…" /></div>
            <div><Label>TikTok</Label><Input value={ex("social_tiktok", "")} onChange={(e) => setEx("social_tiktok", e.target.value)} placeholder="https://tiktok.com/@…" /></div>
            <div><Label>YouTube</Label><Input value={ex("social_youtube", "")} onChange={(e) => setEx("social_youtube", e.target.value)} placeholder="https://youtube.com/…" /></div>
            <div><Label>LinkedIn</Label><Input value={ex("social_linkedin", "")} onChange={(e) => setEx("social_linkedin", e.target.value)} placeholder="https://linkedin.com/in/…" /></div>
          </div>
          <div>
            <Label>Afficher les réseaux sociaux</Label>
            <Select value={ex("social_position", "footer")} onValueChange={(v) => setEx("social_position", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="footer">Dans le pied de page</SelectItem>
                <SelectItem value="header">Dans l'en-tête</SelectItem>
                <SelectItem value="both">En-tête et pied de page</SelectItem>
                <SelectItem value="none">Ne pas afficher</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>}

        {tab === "compte" && <>
          <div><Label>Nom du propriétaire</Label><Input value={ex("owner_name", "")} onChange={(e) => setEx("owner_name", e.target.value)} /></div>
          <div><Label>Email du compte</Label><Input value={ex("owner_email", "")} onChange={(e) => setEx("owner_email", e.target.value)} /></div>
          <div><Label>Photo de profil (URL)</Label><Input value={ex("owner_avatar", "")} onChange={(e) => setEx("owner_avatar", e.target.value)} /></div>
          <div className="flex items-center justify-between rounded border p-3">
            <div><Label>Authentification à deux facteurs</Label><p className="text-xs text-muted-foreground">Sécuriser la connexion admin.</p></div>
            <Switch checked={ex("two_factor", false)} onCheckedChange={(v) => setEx("two_factor", v)} />
          </div>
          <div>
            <Label>Changer le mot de passe</Label>
            <div className="flex gap-2">
              <Input type="password" placeholder="Nouveau mot de passe" value={ex("_new_password", "")} onChange={(e) => setEx("_new_password", e.target.value)} />
              <Button variant="outline" onClick={async () => {
                const np = String(ex("_new_password", ""));
                if (np.length < 6) { toast.error("Mot de passe trop court (6+)"); return; }
                const { error } = await supabase.auth.updateUser({ password: np });
                if (error) toast.error(error.message); else { toast.success("Mot de passe mis à jour"); setEx("_new_password", ""); }
              }}>Mettre à jour</Button>
            </div>
          </div>
        </>}

        {tab === "utilisateurs" && <>
          <p className="text-sm text-muted-foreground">La gestion complète des rôles et invitations se fait sur la page « Rôles utilisateurs ».</p>
          <div><Label>Rôles autorisés (info)</Label><Textarea rows={3} value={ex("roles_note", "admin, manager, caissier, vendeur, comptable, technicien, livreur, client")} onChange={(e) => setEx("roles_note", e.target.value)} /></div>
          <div className="flex items-center justify-between rounded border p-3">
            <Label>Journal d'audit des actions</Label>
            <Switch checked={ex("audit_log", true)} onCheckedChange={(v) => setEx("audit_log", v)} />
          </div>
        </>}

        {tab === "acces" && <>
          <p className="text-sm text-muted-foreground">
            Définissez les onglets du tableau de bord visibles par chaque rôle. Les comptes créés depuis la page de
            connexion sont de simples <strong>clients</strong> : ils n'ont aucun accès à l'administration tant qu'un
            administrateur ne leur attribue pas un rôle du personnel (page « Rôles utilisateurs »).
          </p>
          {STAFF_ROLES.map((role) => {
            const current = ((extras["role_menus"] as Record<string, string[]> | undefined)?.[role]) ?? DEFAULT_ROLE_MENUS[role as AppRole];
            const setRole = (keys: string[]) => {
              const map = { ...((extras["role_menus"] as Record<string, string[]>) ?? {}) };
              map[role] = keys;
              setEx("role_menus", map);
            };
            const disabled = role === "admin";
            return (
              <div key={role} className="rounded border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Label className="text-base">{ROLE_LABELS[role as AppRole]}</Label>
                  {!disabled && (
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => setRole(MENU_ITEMS.map((m) => m.key))}>Tout</Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setRole([])}>Aucun</Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setRole(DEFAULT_ROLE_MENUS[role as AppRole])}>Défaut</Button>
                    </div>
                  )}
                </div>
                {disabled ? (
                  <p className="text-xs text-muted-foreground">L'administrateur a toujours accès à tous les onglets.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {MENU_ITEMS.map((m) => (
                      <label key={m.key} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={current.includes(m.key)}
                          onCheckedChange={(v) => setRole(v ? [...current.filter((k) => k !== m.key), m.key] : current.filter((k) => k !== m.key))}
                        />
                        <span className="truncate">{m.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">Le rôle « Client » n'a jamais accès au tableau de bord : il ne voit que la boutique et ses notifications (nouveaux produits, promotions).</p>
        </>}

        {tab === "paiements" && <>
          <div><Label>Devise principale</Label>
            <Select value={core.primary_currency} onValueChange={(v) => setCore({ ...core, primary_currency: v as Currency })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="CDF">CDF</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Taux USD → CDF</Label><Input type="number" step="0.01" value={core.usd_to_cdf_rate} onChange={(e) => setCore({ ...core, usd_to_cdf_rate: +e.target.value })} /></div>
          <div className="grid gap-3 md:grid-cols-2">
            {[["cash","Espèces"],["mobile_money","Mobile Money"],["card","Carte bancaire"],["bank_transfer","Virement"],["credit","Crédit client"]].map(([k,l]) => (
              <label key={k} className="flex items-center justify-between rounded border p-3">
                <span>{l}</span>
                <Switch checked={ex(`pay_${k}`, k !== "card")} onCheckedChange={(v) => setEx(`pay_${k}`, v)} />
              </label>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Orange Money — Marchand</Label><Input value={ex("om_merchant", "")} onChange={(e) => setEx("om_merchant", e.target.value)} /></div>
            <div><Label>Airtel Money — Marchand</Label><Input value={ex("airtel_merchant", "")} onChange={(e) => setEx("airtel_merchant", e.target.value)} /></div>
            <div><Label>M-Pesa — Marchand</Label><Input value={ex("mpesa_merchant", "")} onChange={(e) => setEx("mpesa_merchant", e.target.value)} /></div>
            <div><Label>Africell Money — Marchand</Label><Input value={ex("africell_merchant", "")} onChange={(e) => setEx("africell_merchant", e.target.value)} /></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>TVA par défaut (%)</Label><Input type="number" step="0.01" value={ex("vat_rate", 0)} onChange={(e) => setEx("vat_rate", +e.target.value)} /></div>
            <div><Label>Remise par défaut (%)</Label><Input type="number" step="0.01" value={ex("default_discount", 0)} onChange={(e) => setEx("default_discount", +e.target.value)} /></div>
          </div>

          <ShwarySection />
        </>}


        {tab === "livraison" && <>
          <div className="flex items-center justify-between rounded border p-3">
            <Label>Retrait en magasin autorisé</Label>
            <Switch checked={ex("pickup_enabled", true)} onCheckedChange={(v) => setEx("pickup_enabled", v)} />
          </div>
          <div className="flex items-center justify-between rounded border p-3">
            <Label>Livraison à domicile activée</Label>
            <Switch checked={ex("delivery_enabled", true)} onCheckedChange={(v) => setEx("delivery_enabled", v)} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Frais livraison par défaut (USD)</Label><Input type="number" step="0.01" value={ex("delivery_fee", 0)} onChange={(e) => setEx("delivery_fee", +e.target.value)} /></div>
            <div><Label>Délai moyen</Label><Input value={ex("delivery_delay", "24-48h")} onChange={(e) => setEx("delivery_delay", e.target.value)} /></div>
          </div>
          <DeliveryCities
            value={(ex("delivery_cities", []) as string[]) ?? []}
            onChange={(v) => setEx("delivery_cities", v)}
            fees={(ex("delivery_city_fees", {}) as Record<string, number>) ?? {}}
            onFeesChange={(v) => setEx("delivery_city_fees", v)}
            defaultFee={Number(ex("delivery_fee", 0)) || 0}
          />
          <div><Label>Zones desservies (une par ligne)</Label>
            <Textarea rows={4} value={ex("delivery_zones", "")} onChange={(e) => setEx("delivery_zones", e.target.value)} placeholder="Gombe&#10;Limete&#10;Ngaliema" />
          </div>
        </>}

        {tab === "stocks" && <>
          <div><Label>Seuil d'alerte stock faible</Label><Input type="number" value={core.low_stock_threshold} onChange={(e) => setCore({ ...core, low_stock_threshold: +e.target.value })} /></div>
          <div className="flex items-center justify-between rounded border p-3">
            <Label>Activer les codes-barres</Label>
            <Switch checked={ex("barcode_enabled", false)} onCheckedChange={(v) => setEx("barcode_enabled", v)} />
          </div>
          <div><Label>Format codes-barres</Label>
            <Select value={ex("barcode_format", "EAN13")} onValueChange={(v) => setEx("barcode_format", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EAN13">EAN-13</SelectItem>
                <SelectItem value="CODE128">Code 128</SelectItem>
                <SelectItem value="QR">QR Code</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded border p-3">
            <Label>Inventaire automatique (déduction ventes)</Label>
            <Switch checked={ex("auto_inventory", true)} onCheckedChange={(v) => setEx("auto_inventory", v)} />
          </div>
        </>}

        {tab === "facturation" && <>
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Préfixe facture</Label><Input value={core.invoice_prefix} onChange={(e) => setCore({ ...core, invoice_prefix: e.target.value })} /></div>
            <div><Label>Format d'impression</Label>
              <Select value={ex("print_format", "A4")} onValueChange={(v) => setEx("print_format", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4">A4</SelectItem>
                  <SelectItem value="A5">A5</SelectItem>
                  <SelectItem value="TICKET80">Ticket 80mm</SelectItem>
                  <SelectItem value="TICKET58">Ticket 58mm</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Couleur d'accent des documents</Label><Input type="color" value={core.document_theme_color} onChange={(e) => setCore({ ...core, document_theme_color: e.target.value })} /></div>
          <div><Label>Mentions légales</Label><Textarea rows={4} value={core.legal_mentions} onChange={(e) => setCore({ ...core, legal_mentions: e.target.value })} /></div>
          <div><Label>Conditions générales de vente</Label><Textarea rows={4} value={ex("terms", "")} onChange={(e) => setEx("terms", e.target.value)} /></div>
          <div className="pt-2">
            <Dialog>
              <DialogTrigger asChild><Button>Ouvrir l'éditeur canvas (facture / reçu)</Button></DialogTrigger>
              <DialogContent className="max-w-6xl">
                <DialogTitle>Éditeur de modèle</DialogTitle>
                <div className="mt-4"><EditorCanvas kind="recu" onSaved={() => toast.success("Modèle enregistré")} /></div>
              </DialogContent>
            </Dialog>
          </div>
        </>}

        {tab === "materiel" && <>
          <div><Label>Imprimante ticket</Label><Input value={ex("printer_ticket", "")} onChange={(e) => setEx("printer_ticket", e.target.value)} placeholder="Ex: EPSON TM-T20" /></div>
          <div><Label>Scanner code-barres</Label><Input value={ex("barcode_scanner", "")} onChange={(e) => setEx("barcode_scanner", e.target.value)} /></div>
          <div className="flex items-center justify-between rounded border p-3">
            <Label>Tiroir-caisse connecté</Label>
            <Switch checked={ex("cash_drawer", false)} onCheckedChange={(v) => setEx("cash_drawer", v)} />
          </div>
          <div><Label>Terminal de paiement</Label><Input value={ex("payment_terminal", "")} onChange={(e) => setEx("payment_terminal", e.target.value)} /></div>
          <div className="rounded-lg border p-4 space-y-3">
            <div>
              <h3 className="text-display font-semibold">Application Windows (mode hors ligne)</h3>
              <p className="text-xs text-muted-foreground">Renseignez le lien du fichier d'installation publié. Il alimente le bouton de téléchargement du tableau de bord.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="md:col-span-2"><Label>Lien de téléchargement</Label><Input value={ex("win_app_url", "")} onChange={(e) => setEx("win_app_url", e.target.value)} placeholder="https://…/CONETEC-win32-x64.zip" /></div>
              <div><Label>Version</Label><Input value={ex("win_app_version", "")} onChange={(e) => setEx("win_app_version", e.target.value)} placeholder="1.0.0" /></div>
              <div><Label>Taille affichée</Label><Input value={ex("win_app_size", "")} onChange={(e) => setEx("win_app_size", e.target.value)} placeholder="180 Mo" /></div>
              <div><Label>Date de publication</Label><Input type="date" value={ex("win_app_date", "")} onChange={(e) => setEx("win_app_date", e.target.value)} /></div>
            </div>
          </div>
        </>}


        {tab === "boutiqueEnLigne" && <>
          <div className="flex items-center justify-between rounded border p-3">
            <Label>Activer la boutique en ligne</Label>
            <Switch checked={ex("shop_enabled", true)} onCheckedChange={(v) => setEx("shop_enabled", v)} />
          </div>
          <div><Label>Domaine personnalisé</Label><Input value={ex("custom_domain", "")} onChange={(e) => setEx("custom_domain", e.target.value)} placeholder="shop.conetec.cd" /></div>
          <div><Label>Titre SEO</Label><Input value={ex("seo_title", "")} onChange={(e) => setEx("seo_title", e.target.value)} /></div>
          <div><Label>Meta description</Label><Textarea rows={2} value={ex("seo_description", "")} onChange={(e) => setEx("seo_description", e.target.value)} /></div>
          <div><Label>Mots-clés</Label><Input value={ex("seo_keywords", "")} onChange={(e) => setEx("seo_keywords", e.target.value)} /></div>
          <div><Label>Politique de confidentialité</Label><Textarea rows={4} value={ex("privacy_policy", "")} onChange={(e) => setEx("privacy_policy", e.target.value)} /></div>
        </>}

        {tab === "notifications" && <>
          <div className="grid gap-3 md:grid-cols-3">
            {[["notify_email","Email"],["notify_sms","SMS"],["notify_whatsapp","WhatsApp"]].map(([k,l]) => (
              <label key={k} className="flex items-center justify-between rounded border p-3">
                <span>{l}</span>
                <Switch checked={ex(k, k === "notify_email")} onCheckedChange={(v) => setEx(k, v)} />
              </label>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[["alert_low_stock","Alerte stock faible"],["alert_new_order","Nouvelle commande"],["alert_new_customer","Nouveau client"],["alert_new_message","Nouveau devis / message"]].map(([k,l]) => (
              <label key={k} className="flex items-center justify-between rounded border p-3">
                <span>{l}</span>
                <Switch checked={ex(k, true)} onCheckedChange={(v) => setEx(k, v)} />
              </label>
            ))}
          </div>
        </>}

        {tab === "fidelite" && <>
          <div className="flex items-center justify-between rounded border p-3">
            <Label>Programme de fidélité activé</Label>
            <Switch checked={ex("loyalty_enabled", false)} onCheckedChange={(v) => setEx("loyalty_enabled", v)} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>1 point = X USD dépensé</Label><Input type="number" step="0.01" value={ex("loyalty_ratio", 1)} onChange={(e) => setEx("loyalty_ratio", +e.target.value)} /></div>
            <div><Label>Valeur d'1 point (USD)</Label><Input type="number" step="0.01" value={ex("loyalty_value", 0.05)} onChange={(e) => setEx("loyalty_value", +e.target.value)} /></div>
          </div>
          <div><Label>Coupons / promotions actifs</Label><Textarea rows={3} value={ex("coupons", "")} onChange={(e) => setEx("coupons", e.target.value)} placeholder="CODE10=10%, WELCOME=5USD" /></div>
        </>}

        {tab === "securite" && <>
          <div className="flex items-center justify-between rounded border p-3">
            <Label>Sauvegardes automatiques</Label>
            <Switch checked={ex("backup_enabled", false)} onCheckedChange={(v) => setEx("backup_enabled", v)} />
          </div>
          <div><Label>Fréquence de sauvegarde</Label>
            <Select value={ex("backup_freq", "daily")} onValueChange={(v) => setEx("backup_freq", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Quotidienne</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                <SelectItem value="monthly">Mensuelle</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Rétention corbeille (jours)</Label><Input type="number" value={core.trash_retention_days} onChange={(e) => setCore({ ...core, trash_retention_days: +e.target.value })} /></div>
          <div><Label>Clés API externes (JSON)</Label><Textarea rows={4} value={ex("api_keys", "")} onChange={(e) => setEx("api_keys", e.target.value)} placeholder='{"service": "clé"}' /></div>
        </>}

        {tab === "integrations" && <>
          <div><Label>WhatsApp Business (numéro)</Label><Input value={ex("whatsapp_business", "")} onChange={(e) => setEx("whatsapp_business", e.target.value)} /></div>
          <div><Label>Facebook Page ID</Label><Input value={ex("fb_page_id", "")} onChange={(e) => setEx("fb_page_id", e.target.value)} /></div>
          <div><Label>Instagram Business ID</Label><Input value={ex("ig_business_id", "")} onChange={(e) => setEx("ig_business_id", e.target.value)} /></div>
          <div><Label>Google Merchant ID</Label><Input value={ex("google_merchant", "")} onChange={(e) => setEx("google_merchant", e.target.value)} /></div>
          <div><Label>Google Analytics ID</Label><Input value={ex("ga_id", "")} onChange={(e) => setEx("ga_id", e.target.value)} placeholder="G-XXXXXXX" /></div>
          <div><Label>Webhooks (une URL par ligne)</Label><Textarea rows={3} value={ex("webhooks", "")} onChange={(e) => setEx("webhooks", e.target.value)} /></div>
        </>}

        {tab === "preferences" && <>
          <div><Label>Thème</Label>
            <Select value={ex("theme", "light")} onValueChange={(v) => setEx("theme", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Clair</SelectItem>
                <SelectItem value="dark">Sombre</SelectItem>
                <SelectItem value="system">Système</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Langue</Label>
            <Select value={ex("locale", "fr-FR")} onValueChange={(v) => setEx("locale", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fr-FR">Français (FR)</SelectItem>
                <SelectItem value="en-US">English (US)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Format de date</Label>
            <Select value={ex("date_format", "dd/MM/yyyy")} onValueChange={(v) => setEx("date_format", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dd/MM/yyyy">31/12/2026</SelectItem>
                <SelectItem value="yyyy-MM-dd">2026-12-31</SelectItem>
                <SelectItem value="MM/dd/yyyy">12/31/2026</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>}

        {tab === "donnees" && <>
          <div>
            <Label>Exporter les paramètres (JSON)</Label>
            <div className="flex gap-2 items-center">
              <Button onClick={() => { const blob = new Blob([jsonExport], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "settings.json"; a.click(); URL.revokeObjectURL(url); toast.success("Export téléchargé"); }}>Télécharger</Button>
              <Input type="file" accept="application/json" onChange={async (e) => {
                const file = e.target.files?.[0]; if (!file) return;
                try {
                  const obj = JSON.parse(await file.text());
                  const { error } = await supabase.from("settings").update(obj).eq("id", 1);
                  if (error) throw error;
                  toast.success("Paramètres importés");
                  qc.invalidateQueries({ queryKey: ["settings"] });
                } catch (err) { toast.error((err as Error).message); }
              }} />
            </div>
          </div>
          <div>
            <Label>Aperçu brut</Label>
            <Textarea rows={10} readOnly value={jsonExport} className="font-mono text-xs" />
          </div>
        </>}

        {tab === "apropos" && <>
          <div><Label>Version de l'application</Label><Input value={ex("app_version", "v1.0.0")} onChange={(e) => setEx("app_version", e.target.value)} /></div>
          <div><Label>Email de support</Label><Input value={ex("support_email", "support@conetec.cd")} onChange={(e) => setEx("support_email", e.target.value)} /></div>
          <div><Label>Téléphone support</Label><Input value={ex("support_phone", "")} onChange={(e) => setEx("support_phone", e.target.value)} /></div>
          <div><Label>Licence / informations légales</Label><Textarea rows={5} value={ex("license", "")} onChange={(e) => setEx("license", e.target.value)} /></div>
        </>}

        <div className="pt-4 border-t">
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full md:w-auto">
            {save.isPending ? "Enregistrement…" : "Enregistrer les modifications"}
          </Button>
        </div>
      </CardContent></Card>
    </div>
  );
}

function ShwarySection() {
  const qc = useQueryClient();
  const [merchantId, setMerchantId] = useState("");
  const [merchantKey, setMerchantKey] = useState("");
  const [sandbox, setSandbox] = useState(true);
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["payment_credentials", "shwary"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payment_credentials" as never)
        .select("merchant_id, merchant_key, sandbox")
        .eq("provider" as never, "shwary" as never)
        .maybeSingle();
      return (data ?? null) as { merchant_id: string | null; merchant_key: string | null; sandbox: boolean } | null;
    },
  });

  useEffect(() => {
    if (data) {
      setMerchantId(data.merchant_id ?? "");
      setMerchantKey(data.merchant_key ?? "");
      setSandbox(data.sandbox ?? true);
    }
  }, [data]);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("payment_credentials" as never)
      .upsert(
        { provider: "shwary", merchant_id: merchantId || null, merchant_key: merchantKey || null, sandbox, updated_at: new Date().toISOString() } as never,
        { onConflict: "provider" } as never,
      );
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Shwary configuré"); qc.invalidateQueries({ queryKey: ["payment_credentials", "shwary"] }); }
  }

  return (
    <div className="min-w-0 rounded-2xl border p-4 sm:p-5 space-y-4 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-display font-semibold">Shwary — Mobile Money (boutique en ligne)</h3>
          <p className="text-xs text-muted-foreground">Créez votre compte marchand sur app.shwary.com puis collez vos identifiants ici.</p>
        </div>
        <label className="flex items-center gap-2 text-sm"><Switch checked={sandbox} onCheckedChange={setSandbox} /> Sandbox (test)</label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div><Label>Identifiant marchand (x-merchant-id)</Label><Input value={merchantId} onChange={(e) => setMerchantId(e.target.value)} placeholder="uuid marchand" /></div>
        <div><Label>Clé marchande (x-merchant-key)</Label><Input type="password" value={merchantKey} onChange={(e) => setMerchantKey(e.target.value)} placeholder="shwary_live_..." /></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded border p-3 bg-background/50">
        <div className="min-w-0 break-all text-xs text-muted-foreground">URL de callback à renseigner côté Shwary : <br /><code className="text-[11px]">{typeof window !== "undefined" ? `${window.location.origin}/api/public/shwary/callback` : ""}</code></div>
        <Button size="sm" onClick={save} disabled={saving}>{saving ? "…" : "Enregistrer Shwary"}</Button>
      </div>
    </div>
  );
}

const RDC_CITIES = [
  "Kinshasa", "Lubumbashi", "Goma", "Bukavu", "Kisangani", "Matadi",
  "Mbuji-Mayi", "Kananga", "Kolwezi", "Likasi", "Bunia", "Uvira",
  "Boma", "Kikwit", "Tshikapa", "Mbandaka",
];

function DeliveryCities({
  value, onChange, fees, onFeesChange, defaultFee,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  fees: Record<string, number>;
  onFeesChange: (v: Record<string, number>) => void;
  defaultFee: number;
}) {
  const [custom, setCustom] = useState("");
  const selected = Array.isArray(value) ? value : [];
  const feeMap = fees && typeof fees === "object" ? fees : {};
  const toggle = (city: string) =>
    onChange(selected.includes(city) ? selected.filter((c) => c !== city) : [...selected, city]);
  const addCustom = () => {
    const c = custom.trim();
    if (!c) return;
    if (!selected.includes(c)) onChange([...selected, c]);
    setCustom("");
  };
  const extras = selected.filter((c) => !RDC_CITIES.includes(c));

  return (
    <div className="rounded border p-3">
      <Label>Villes où la livraison est active</Label>
      <p className="mt-1 text-xs text-muted-foreground">
        Sélectionnez une ou plusieurs villes, puis définissez les frais de livraison propres à chaque ville.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {[...RDC_CITIES, ...extras].map((city) => {
          const on = selected.includes(city);
          return (
            <button
              key={city}
              type="button"
              onClick={() => toggle(city)}
              className={`truncate rounded-md border px-3 py-2 text-left text-xs font-medium transition-colors ${
                on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
              }`}
            >
              {city}
            </button>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <Input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
          placeholder="Autre ville…"
        />
        <Button type="button" variant="outline" onClick={addCustom}>Ajouter</Button>
      </div>

      {selected.length > 0 && (
        <div className="mt-4 space-y-2 border-t pt-3">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Frais de livraison par ville (USD)</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {selected.map((city) => (
              <div key={city} className="grid grid-cols-[minmax(0,1fr)_120px] items-center gap-2 rounded-md border px-3 py-2">
                <span className="truncate text-sm font-medium">{city}</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={feeMap[city] ?? defaultFee}
                  onChange={(e) => onFeesChange({ ...feeMap, [city]: +e.target.value })}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2 text-xs text-muted-foreground">
        {selected.length ? `${selected.length} ville(s) active(s) : ${selected.join(", ")}` : "Aucune ville sélectionnée"}
      </div>
    </div>
  );
}
