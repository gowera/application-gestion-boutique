import { shopStoragePath } from "@/lib/shop-storage";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/lib/currency";
import { setAdminSettings } from "@/lib/local/adapter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Applies the shop's chosen dashboard color everywhere. */
export function ShopTheme() {
  const { data } = useSettings();
  const color = (data as unknown as Record<string, unknown> | undefined)?.["brand_color"];
  useEffect(() => {
    const root = document.documentElement;
    if (typeof color === "string" && color) { root.style.setProperty("--primary", color); root.style.setProperty("--ring", color); }
    else { root.style.removeProperty("--primary"); root.style.removeProperty("--ring"); }
  }, [color]);
  return null;
}

/** First-connection wizard: the owner gives the shop its identity. */
export function ShopOnboarding() {
  const { data } = useSettings();
  const qc = useQueryClient();
  const s = data as unknown as Record<string, unknown> | undefined;
  const desktopLocal = typeof window !== "undefined" && Boolean(window.conetecDesktop);
  const open = desktopLocal ? !s?.["onboarded"] : Boolean(s) && !s?.["onboarded"] && navigator.onLine;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [color, setColor] = useState("#22a05a");
  const [logo, setLogo] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (desktopLocal) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error ?? new Error("Impossible de lire le logo."));
        reader.readAsDataURL(file);
      });
      setLogo(dataUrl);
      return;
    }
    const path = await shopStoragePath(`site-assets/${crypto.randomUUID()}-${file.name}`);
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true, contentType: file.type || "image/png" });
    if (error) return toast.error(error.message);
    setLogo(supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl);
  }

  async function submit() {
    if (!name.trim()) return toast.error("Indiquez le nom de votre boutique.");
    setBusy(true);
    try {
      await setAdminSettings({ shop_name: name.trim(), logo_url: logo || null, phone: phone || null, address: address || null, email: email || null, document_theme_color: color, brand_color: color, onboarded: true });
      await qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Votre boutique est prête");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <Dialog open={open}>
      <DialogContent className="max-h-[92vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Bienvenue ! Configurez votre boutique</DialogTitle>
          <DialogDescription>Ces informations apparaîtront dans l'application et sur vos factures. Vous pourrez les modifier dans Paramètres.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div><Label>Nom de la boutique *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Boutique Amani" /></div>
          <div><Label>Logo</Label><Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
            {logo && <img src={logo} alt="Logo" className="mt-2 h-16 object-contain" />}</div>
          <div><Label>Téléphone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div><Label>Adresse</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label>Couleur du tableau de bord</Label><Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-24 p-1" /></div>
          <Button onClick={submit} disabled={busy}>{busy ? "Enregistrement…" : "Commencer"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
