import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSettings, type Currency } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { setAdminSettings, useLocalModeEnabled } from "@/lib/local/adapter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "@/components/ui/dialog";
import EditorCanvas from "@/components/documents/editor-canvas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings")({ component: Page });

function Page() {
  const { data } = useSettings();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"boutique" | "compte" | "utilisateurs" | "paiements" | "livraison" | "stocks" | "facturation" | "materiel" | "boutiqueEnLigne" | "notifications" | "fidelite" | "securite" | "integrations" | "preferences" | "donnees" | "apropos">("boutique");
  const [f, setF] = useState({ shop_name: "", address: "", phone: "", whatsapp: "", email: "", primary_currency: "USD" as Currency, usd_to_cdf_rate: 2800, low_stock_threshold: 5, invoice_prefix: "CNT", legal_mentions: "", document_theme_color: "#0b1e3f", map_lat: "", map_lng: "", services_gallery: "", payment_gateways: "", trash_retention_days: 30,
    // additional fields
    logo_url: "",
    favicon_url: "",
    banner_url: "",
    primary_color: "#0b1e3f",
    secondary_color: "#06b6d4",
    social_links: "{}",
    taxes: "{}",
    invoice_numbering: "",
    invoice_info: "",
    payment_methods: "[]",
    delivery_fees: 0,
    delivery_zones: "[]",
    terms: "",
    privacy_policy: "",
    backup_enabled: false,
  });
  const localMode = useLocalModeEnabled();
  useEffect(() => { if (data) setF({ shop_name: data.shop_name, address: data.address ?? "", phone: data.phone ?? "", whatsapp: data.whatsapp ?? "", email: data.email ?? "", primary_currency: data.primary_currency, usd_to_cdf_rate: data.usd_to_cdf_rate, low_stock_threshold: data.low_stock_threshold, invoice_prefix: data.invoice_prefix, legal_mentions: (data as { legal_mentions?: string | null }).legal_mentions ?? "", document_theme_color: (data as { document_theme_color?: string | null }).document_theme_color ?? "#0b1e3f", map_lat: ((data as { map_lat?: number | null }).map_lat ?? "").toString(), map_lng: ((data as { map_lng?: number | null }).map_lng ?? "").toString(), services_gallery: JSON.stringify((data as { services_gallery?: unknown }).services_gallery ?? []), payment_gateways: JSON.stringify((data as { payment_gateways?: unknown }).payment_gateways ?? {}), trash_retention_days: (data as { trash_retention_days?: number | null }).trash_retention_days ?? 30,
    // additional fields mapping
    logo_url: (data as any).logo_url ?? "",
    favicon_url: (data as any).favicon_url ?? "",
    banner_url: (data as any).banner_url ?? "",
    primary_color: (data as any).primary_color ?? "#0b1e3f",
    secondary_color: (data as any).secondary_color ?? "#06b6d4",
    social_links: JSON.stringify((data as any).social_links ?? {}),
    taxes: JSON.stringify((data as any).taxes ?? {}),
    invoice_numbering: (data as any).invoice_numbering ?? "",
    invoice_info: (data as any).invoice_info ?? "",
    payment_methods: JSON.stringify((data as any).payment_methods ?? []),
    delivery_fees: (data as any).delivery_fees ?? 0,
    delivery_zones: JSON.stringify((data as any).delivery_zones ?? []),
    terms: (data as any).terms ?? "",
    privacy_policy: (data as any).privacy_policy ?? "",
    backup_enabled: (data as any).backup_enabled ?? false,
  }); }, [data]);
  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        shop_name: f.shop_name,
        address: f.address,
        phone: f.phone,
        whatsapp: f.whatsapp,
        email: f.email,
        primary_currency: f.primary_currency,
        usd_to_cdf_rate: f.usd_to_cdf_rate,
        low_stock_threshold: f.low_stock_threshold,
        invoice_prefix: f.invoice_prefix,
        legal_mentions: f.legal_mentions,
        document_theme_color: f.document_theme_color,
        map_lat: f.map_lat ? Number(f.map_lat) : null,
        map_lng: f.map_lng ? Number(f.map_lng) : null,
        services_gallery: f.services_gallery ? JSON.parse(f.services_gallery) : [],
        payment_gateways: f.payment_gateways ? JSON.parse(f.payment_gateways) : {},
        trash_retention_days: f.trash_retention_days,
        // additional fields
        logo_url: f.logo_url,
        favicon_url: f.favicon_url,
        banner_url: f.banner_url,
        primary_color: f.primary_color,
        secondary_color: f.secondary_color,
        social_links: f.social_links ? JSON.parse(f.social_links) : {},
        taxes: f.taxes ? JSON.parse(f.taxes) : {},
        invoice_numbering: f.invoice_numbering,
        invoice_info: f.invoice_info,
        payment_methods: f.payment_methods ? JSON.parse(f.payment_methods) : [],
        delivery_fees: Number(f.delivery_fees ?? 0),
        delivery_zones: f.delivery_zones ? JSON.parse(f.delivery_zones) : [],
        terms: f.terms,
        privacy_policy: f.privacy_policy,
        backup_enabled: Boolean((f as any).backup_enabled),
      };
      await setAdminSettings(payload);
    },
    onSuccess: () => { toast.success("Paramètres enregistrés"); qc.invalidateQueries({ queryKey: ["settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const [localBusy, setLocalBusy] = useState(false);
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-display text-2xl font-bold">Paramètres</h1>
      <Card><CardContent className="p-2 flex flex-wrap gap-2">
        {([
          ['boutique','Boutique'],
          ['compte','Compte'],
          ['utilisateurs','Utilisateurs'],
          ['paiements','Paiements'],
          ['livraison','Livraison'],
          ['stocks','Stocks'],
          ['facturation','Facturation'],
          ['materiel','Matériel'],
          ['boutiqueEnLigne','Boutique en ligne'],
          ['notifications','Notifications'],
          ['fidelite','Fidélité'],
          ['securite','Sécurité'],
          ['integrations','Intégrations'],
          ['preferences','Préférences'],
          ['donnees','Données'],
          ['apropos','À propos'],
        ] as const).map(([value,label]) => <Button key={value} variant={tab === value ? 'default' : 'outline'} size="sm" onClick={() => setTab(value)}>{label}</Button>)}
      </CardContent></Card>
      <Card><CardContent className="p-6 space-y-4">
        {tab === 'boutique' && <><div><Label>Nom de la boutique</Label><Input value={f.shop_name} onChange={(e) => setF({ ...f, shop_name: e.target.value })} placeholder="Nom de votre boutique" /></div><div><Label>Description</Label><Textarea rows={3} placeholder="Description courte de la boutique" /></div>
          <div className="grid gap-4 md:grid-cols-2"><div><Label>Logo</Label><Input type="file" onChange={async (e) => {
              if (localMode) { toast.error('Upload de fichiers non pris en charge en mode local'); return; }
              const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
              const path = `site-assets/${crypto.randomUUID()}-${file.name}`;
              const { error: uploadError } = await supabase.storage.from('site-assets').upload(path, file, { upsert: true, contentType: file.type || 'image/png' });
              if (uploadError) { toast.error(uploadError.message); return; }
              const url = supabase.storage.from('site-assets').getPublicUrl(path).data.publicUrl;
              setF({ ...f, logo_url: url });
              toast.success('Logo uploadé');
            }} /></div><div><Label>Favicon</Label><Input type="file" onChange={async (e) => {
              if (localMode) { toast.error('Upload de fichiers non pris en charge en mode local'); return; }
              const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
              const path = `site-assets/${crypto.randomUUID()}-${file.name}`;
              const { error: uploadError } = await supabase.storage.from('site-assets').upload(path, file, { upsert: true, contentType: file.type || 'image/png' });
              if (uploadError) { toast.error(uploadError.message); return; }
              const url = supabase.storage.from('site-assets').getPublicUrl(path).data.publicUrl;
              setF({ ...f, favicon_url: url });
              toast.success('Favicon uploadé');
            }} /></div></div>
          <div className="grid gap-4 md:grid-cols-2"><div><Label>Bannière d'accueil</Label><Input type="file" onChange={async (e) => {
              if (localMode) { toast.error('Upload de fichiers non pris en charge en mode local'); return; }
              const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
              const path = `site-assets/${crypto.randomUUID()}-${file.name}`;
              const { error: uploadError } = await supabase.storage.from('site-assets').upload(path, file, { upsert: true, contentType: file.type || 'image/png' });
              if (uploadError) { toast.error(uploadError.message); return; }
              const url = supabase.storage.from('site-assets').getPublicUrl(path).data.publicUrl;
              setF({ ...f, banner_url: url });
              toast.success('Bannière uploadée');
            }} /></div><div><Label>Couleur principale</Label><Input type="color" value={(f as any).primary_color} onChange={(e) => setF({ ...f, primary_color: e.target.value })} /></div></div>
          <div className="grid gap-4 md:grid-cols-2"><div><Label>Téléphone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div><div><Label>Email</Label><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div></div><div><Label>Adresse physique</Label><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="Adresse complète" /></div><div className="grid gap-4 md:grid-cols-2"><div><Label>Latitude</Label><Input value={f.map_lat} onChange={(e) => setF({ ...f, map_lat: e.target.value })} /></div><div><Label>Longitude</Label><Input value={f.map_lng} onChange={(e) => setF({ ...f, map_lng: e.target.value })} /></div></div><div><Label>Galerie services (JSON)</Label><Textarea rows={4} value={f.services_gallery} onChange={(e) => setF({ ...f, services_gallery: e.target.value })} placeholder='[{"title":"Installation","image_url":"..."}]' /></div></>}
        {tab === 'compte' && <><div><Label>Informations du propriétaire</Label><Input placeholder="Nom du propriétaire" /></div><div><Label>Mot de passe</Label><Input type="password" placeholder="Nouveau mot de passe" /></div><div><Label>Photo de profil</Label><Input placeholder="URL de l’image" /></div><div><Label>Authentification à deux facteurs</Label><Input placeholder="À brancher plus tard" /></div></>}
        {tab === 'utilisateurs' && <><div><Label>Ajouter un employé</Label><Input placeholder="Nom, email ou téléphone" /></div><div><Label>Rôles</Label><Textarea rows={3} placeholder="Caissier, Gérant, Vendeur, Livreur..." /></div><div><Label>Historique des actions</Label><Textarea rows={3} placeholder="Journal d’audit" /></div></>}
        {tab === 'paiements' && <><div><Label>Moyens de paiement acceptés</Label><Textarea rows={4} placeholder="Espèces, carte, Orange Money, Airtel Money, PayPal..." /></div><div><Label>Agrégateurs Mobile Money (JSON)</Label><Textarea rows={5} value={f.payment_gateways} onChange={(e) => setF({ ...f, payment_gateways: e.target.value })} placeholder='{"mobile_money":{"enabled":true,"api_key":"..."}}' /></div><div><Label>Taxes / remises</Label><Textarea rows={3} placeholder="TVA, réductions par défaut" /></div></>}
        {tab === 'livraison' && <><div><Label>Zones desservies</Label><Textarea rows={3} placeholder="Quartiers, villes, pays" /></div><div><Label>Frais de livraison</Label><Input placeholder="0 ou 5" /></div><div><Label>Délai</Label><Input placeholder="24h / 48h" /></div><div><Label>Retrait en magasin</Label><Input placeholder="Oui / Non" /></div></>}
        {tab === 'stocks' && <><div><Label>Alerte de stock faible</Label><Input type="number" value={f.low_stock_threshold} onChange={(e) => setF({ ...f, low_stock_threshold: +e.target.value })} /></div><div><Label>Stock minimum</Label><Input placeholder="0" /></div><div><Label>Codes-barres</Label><Input placeholder="Activation / format" /></div><div><Label>Inventaire automatique</Label><Input placeholder="Oui / Non" /></div></>}
        {tab === 'facturation' && <>
          <div><Label>Logo sur factures</Label><Input placeholder="URL du logo" /></div>
          <div><Label>Préfixe</Label><Input value={f.invoice_prefix} onChange={(e) => setF({ ...f, invoice_prefix: e.target.value })} /></div>
          <div><Label>Conditions générales</Label><Textarea rows={4} placeholder="Conditions de vente et facturation" /></div>
          <div><Label>Format d’impression</Label><Input placeholder="A4 / ticket thermique" /></div>
          <div className="pt-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button>Éditeur de modèles (facture / reçu)</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>Éditeur de modèle - facture / reçu</DialogTitle>
                <div className="mt-4">
                  <EditorCanvas onSaved={() => { toast.success('Modèle personnalisé enregistré'); qc.invalidateQueries({ queryKey: ['settings'] }); }} />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </>}
        {tab === 'materiel' && <><div><Label>Imprimante ticket</Label><Input placeholder="Nom du périphérique" /></div><div><Label>Scanner code-barres</Label><Input placeholder="Nom du périphérique" /></div><div><Label>Tiroir-caisse</Label><Input placeholder="Oui / Non" /></div><div><Label>Terminal de paiement</Label><Input placeholder="Nom du terminal" /></div></>}
        {tab === 'boutiqueEnLigne' && <><div><Label>Activer la boutique en ligne</Label><Input placeholder="Oui / Non" /></div><div><Label>Domaine personnalisé</Label><Input placeholder="shop.example.com" /></div><div><Label>SEO</Label><Textarea rows={3} placeholder="Titre, meta description, mots-clés" /></div><div><Label>Réseaux sociaux / politiques</Label><Textarea rows={3} placeholder="Facebook, Instagram, confidentialité, cookies" /></div></>}
        {tab === 'notifications' && <><div><Label>SMS / WhatsApp / E-mail</Label><Textarea rows={3} placeholder="Activation des canaux" /></div><div><Label>Alertes</Label><Textarea rows={3} placeholder="Stock faible, nouveaux clients, nouvelles commandes" /></div></>}
        {tab === 'fidelite' && <><div><Label>Points de fidélité</Label><Input placeholder="1 point = X" /></div><div><Label>Coupons / promotions</Label><Textarea rows={3} placeholder="Promotions automatiques" /></div></>}
        {tab === 'securite' && <><div><Label>Sauvegardes automatiques</Label><Input placeholder="Oui / Non" /></div><div><Label>Export / restauration</Label><Textarea rows={3} placeholder="Sauvegardes et restauration" /></div><div><Label>Clés API</Label><Textarea rows={3} placeholder="Clés ou tokens" /></div></>}
        {tab === 'integrations' && <><div><Label>WhatsApp Business / Facebook / Instagram / TikTok / Google Merchant</Label><Textarea rows={4} placeholder="Intégrations externes" /></div><div><Label>API / Webhooks</Label><Textarea rows={3} placeholder="Endpoints et secrets" /></div></>}
        {tab === 'preferences' && <><div><Label>Thème</Label><Input placeholder="clair / sombre" /></div><div><Label>Couleur principale</Label><Input type="color" value={f.document_theme_color} onChange={(e) => setF({ ...f, document_theme_color: e.target.value })} /></div><div><Label>Format de date / nombre</Label><Textarea rows={3} placeholder="fr-FR, USD, etc." /></div></>}
        {tab === 'donnees' && <><div><Label>Importer des produits</Label><Input placeholder="CSV / JSON" /></div><div><Label>Exporter des données</Label><Input placeholder="CSV / Excel / JSON" /></div><div><Label>Réinitialiser les données de démo</Label><Input placeholder="Action à confirmer" /></div></>}
        {tab === 'donnees' && <>
          <div>
            <Label>Exporter les paramètres (JSON)</Label>
            <div className="flex gap-2 items-center">
              <Button onClick={() => { const payload = JSON.stringify(data ?? {}, null, 2); const blob = new Blob([payload], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'settings.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); toast.success('Export téléchargé'); }}>Exporter</Button>
              <Input type="file" onChange={async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return; try { const text = await file.text(); const obj = JSON.parse(text); // update settings row
                  if (localMode) {
                    await setAdminSettings(obj);
                    toast.success('Paramètres importés en mode local');
                    qc.invalidateQueries({ queryKey: ['settings'] });
                    return;
                  }
                  const { error } = await supabase.from('settings').update(obj).eq('id', 1);
                  if (error) throw error; toast.success('Paramètres importés'); qc.invalidateQueries({ queryKey: ['settings'] });
                } catch (err: any) { toast.error(err?.message ?? 'Import failed'); }
              }} />
            </div>
          </div>
          <div>
            <Label>Mode local (Electron)</Label>
            <div className="flex gap-2 items-center">
              <Button disabled={localBusy} onClick={async () => {
                if (!(typeof window !== 'undefined' && (window as any).electronAPI)) return toast.error('API Electron non disponible');
                try { setLocalBusy(true); const res = await (window as any).electronAPI.initLocalDb(); if (res?.ok) toast.success('Base locale initialisée'); else toast.error(res?.error || 'Erreur lors de l\'initialisation'); } catch (e: any) { toast.error(e?.message ?? 'Erreur'); } finally { setLocalBusy(false); }
              }}>Initialiser la DB locale</Button>
              <Button disabled={localBusy} onClick={async () => {
                if (!(typeof window !== 'undefined' && (window as any).electronAPI)) return toast.error('API Electron non disponible');
                try { setLocalBusy(true); const res = await (window as any).electronAPI.syncPull(); if (res?.ok) { toast.success('Synchronisation pull terminée'); qc.invalidateQueries({ queryKey: ['settings','auth','roles'] }); } else toast.error(res?.error || 'Erreur pull'); } catch (e: any) { toast.error(e?.message ?? 'Erreur'); } finally { setLocalBusy(false); }
              }}>Synchroniser (pull)</Button>
              <Button disabled={localBusy} onClick={async () => {
                if (!(typeof window !== 'undefined' && (window as any).electronAPI)) return toast.error('API Electron non disponible');
                try { setLocalBusy(true); const res = await (window as any).electronAPI.syncPush(); if (res?.ok) toast.success('Synchronisation push terminée'); else toast.error(res?.error || 'Erreur push'); } catch (e: any) { toast.error(e?.message ?? 'Erreur'); } finally { setLocalBusy(false); }
              }}>Synchroniser (push)</Button>
            </div>
          </div>
        </>}
        {tab === 'apropos' && <><div><Label>Version</Label><Input placeholder="v1.0.0" /></div><div><Label>Support</Label><Input placeholder="support@entreprise.com" /></div><div><Label>Licence / conditions</Label><Textarea rows={4} placeholder="Informations légales et support" /></div></>}
        <Button onClick={() => save.mutate()} disabled={save.isPending}>Enregistrer</Button>
      </CardContent></Card>
    </div>
  );
}
