import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StorageImage } from "@/components/storage-image";
import { FileText, Loader2, Pencil, Plus, Trash2, User } from "lucide-react";
import {
  useAdminTeam, useDeleteTeamMember, useSaveTeamMember, uploadTeamFile,
  type TeamMember, type TeamMemberInput,
} from "@/lib/team";
import { resolveImageUrl } from "@/lib/storage";

export const Route = createFileRoute("/_authenticated/admin/team")({ component: TeamAdminPage });

const EMPTY: TeamMemberInput = {
  name: "", role: "", bio: "", photo_url: null, cv_url: null,
  email: "", phone: "", sort_order: 0, is_published: true,
  website_url: "", linkedin_url: "", facebook_url: "", instagram_url: "", youtube_url: "", x_url: "",
};


function MemberDialog({ member, trigger }: { member?: TeamMember; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TeamMemberInput>(member ?? EMPTY);
  const [uploading, setUploading] = useState<"photo" | "cv" | null>(null);
  const save = useSaveTeamMember();

  const patch = (p: Partial<TeamMemberInput>) => setForm((f) => ({ ...f, ...p }));

  async function upload(file: File, kind: "photo" | "cv") {
    setUploading(kind);
    try {
      const url = await uploadTeamFile(file, kind);
      patch(kind === "photo" ? { photo_url: url } : { cv_url: url });
      toast.success(kind === "photo" ? "Photo téléversée" : "CV téléversé");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setForm(member ?? EMPTY); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{member ? "Modifier le membre" : "Ajouter un membre"}</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nom complet *</Label>
            <Input value={form.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Ex : Jean Kabila" />
          </div>
          <div>
            <Label>Rôle / fonction</Label>
            <Input value={form.role} onChange={(e) => patch({ role: e.target.value })} placeholder="Ingénieur électricien" />
          </div>
          <div>
            <Label>Ordre d'affichage</Label>
            <Input type="number" value={form.sort_order} onChange={(e) => patch({ sort_order: Number(e.target.value || 0) })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={form.email ?? ""} onChange={(e) => patch({ email: e.target.value })} />
          </div>
          <div>
            <Label>Téléphone</Label>
            <Input value={form.phone ?? ""} onChange={(e) => patch({ phone: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Biographie / parcours</Label>
            <Textarea rows={4} value={form.bio ?? ""} onChange={(e) => patch({ bio: e.target.value })} placeholder="Expérience, spécialités, certifications…" />
          </div>
          <div>
            <Label>Photo</Label>
            <Input type="file" accept="image/*" disabled={uploading === "photo"}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, "photo"); }} />
            {uploading === "photo" && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Téléversement…</p>}
            {form.photo_url && (
              <div className="mt-2 h-20 w-20 overflow-hidden rounded-lg border bg-secondary">
                <StorageImage src={form.photo_url} alt="Photo" className="h-full w-full object-cover" />
              </div>
            )}
          </div>
          <div>
            <Label>CV (PDF ou image)</Label>
            <Input type="file" accept=".pdf,image/*" disabled={uploading === "cv"}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, "cv"); }} />
            {uploading === "cv" && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Téléversement…</p>}
            {form.cv_url && (
              <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-xs"
                onClick={async () => window.open((await resolveImageUrl(form.cv_url)) || form.cv_url!, "_blank", "noopener")}>
                <FileText className="mr-1 h-3 w-3" /> Voir le CV chargé
              </Button>
            )}
          </div>
          <div className="sm:col-span-2">
            <Label>CV en ligne (lien)</Label>
            <Input value={form.cv_url ?? ""} onChange={(e) => patch({ cv_url: e.target.value })} placeholder="https://… (ou téléversez un fichier ci-dessus)" />
          </div>
          <div className="sm:col-span-2">
            <Label>Site web</Label>
            <Input value={form.website_url ?? ""} onChange={(e) => patch({ website_url: e.target.value })} placeholder="https://exemple.com" />
          </div>
          <div>
            <Label>LinkedIn</Label>
            <Input value={form.linkedin_url ?? ""} onChange={(e) => patch({ linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/…" />
          </div>
          <div>
            <Label>Facebook</Label>
            <Input value={form.facebook_url ?? ""} onChange={(e) => patch({ facebook_url: e.target.value })} placeholder="https://facebook.com/…" />
          </div>
          <div>
            <Label>Instagram</Label>
            <Input value={form.instagram_url ?? ""} onChange={(e) => patch({ instagram_url: e.target.value })} placeholder="https://instagram.com/…" />
          </div>
          <div>
            <Label>YouTube</Label>
            <Input value={form.youtube_url ?? ""} onChange={(e) => patch({ youtube_url: e.target.value })} placeholder="https://youtube.com/@…" />
          </div>
          <div className="sm:col-span-2">
            <Label>X (Twitter)</Label>
            <Input value={form.x_url ?? ""} onChange={(e) => patch({ x_url: e.target.value })} placeholder="https://x.com/…" />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Switch checked={form.is_published} onCheckedChange={(v) => patch({ is_published: v })} />
            <span className="text-sm">Afficher sur le site public</span>
          </div>

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button
            disabled={save.isPending}
            onClick={() => {
              if (!form.name.trim()) { toast.error("Le nom est requis"); return; }
              save.mutate(form, {
                onSuccess: () => { toast.success("Membre enregistré"); setOpen(false); },
                onError: (e) => toast.error((e as Error).message),
              });
            }}
          >
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TeamAdminPage() {
  const { data: team, isLoading } = useAdminTeam();
  const del = useDeleteTeamMember();

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-display text-2xl font-bold">Espace équipe</h1>
          <p className="text-sm text-muted-foreground">Gérez les membres affichés sur la page publique « Notre équipe ».</p>
        </div>
        <MemberDialog trigger={<Button><Plus className="mr-2 h-4 w-4" />Ajouter un membre</Button>} />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : !team?.length ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Aucun membre pour l'instant.</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {team.map((m) => (
            <Card key={m.id} className="min-w-0">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border bg-secondary">
                  <StorageImage
                    src={m.photo_url ?? undefined}
                    alt={m.name}
                    className="h-full w-full object-cover"
                    fallback={<div className="grid h-full w-full place-items-center"><User className="h-6 w-6 text-muted-foreground/40" /></div>}
                  />
                </div>
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">{m.name}</CardTitle>
                  <p className="truncate text-xs text-muted-foreground">{m.role || "—"}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="line-clamp-3 text-xs text-muted-foreground">{m.bio || "Aucune biographie."}</p>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className={`rounded px-2 py-0.5 font-semibold ${m.is_published ? "bg-energy/10 text-energy" : "bg-muted text-muted-foreground"}`}>
                    {m.is_published ? "Publié" : "Masqué"}
                  </span>
                  {m.cv_url && <span className="rounded bg-primary/10 px-2 py-0.5 font-semibold text-primary">CV joint</span>}
                  <span className="text-muted-foreground">Ordre : {m.sort_order}</span>
                </div>
                <div className="flex gap-2">
                  <MemberDialog member={m} trigger={<Button variant="outline" size="sm" className="flex-1"><Pencil className="mr-1 h-3.5 w-3.5" />Modifier</Button>} />
                  <Button
                    variant="destructive" size="sm"
                    onClick={() => {
                      if (!confirm(`Supprimer ${m.name} ?`)) return;
                      del.mutate(m.id, { onSuccess: () => toast.success("Membre supprimé"), onError: (e) => toast.error((e as Error).message) });
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
