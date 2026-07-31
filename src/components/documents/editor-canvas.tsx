"use client";

import React, { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Type, Square, Minus, Image as ImageIcon, Table as TableIcon, RotateCcw, Save } from "lucide-react";
import {
  type CanvasElement, type CanvasTemplate, type DocumentKind,
  getCustomTemplate, setCustomTemplate, resetCustomTemplate, newElement,
  AVAILABLE_VARIABLES, setStoredDocumentTemplate,
} from "@/lib/document-template";
import { TemplatePreview } from "@/components/documents/template-preview";
import { toast } from "sonner";

const PX_PER_MM = 3;

const PAGE_PRESETS: Array<{ label: string; w: number; h: number }> = [
  { label: "A4 (210 × 297)", w: 210, h: 297 },
  { label: "A5 (148 × 210)", w: 148, h: 210 },
  { label: "Ticket 80mm", w: 80, h: 220 },
  { label: "Ticket 58mm", w: 58, h: 180 },
];

export function EditorCanvas({ kind, onSaved }: { kind: DocumentKind; onSaved?: () => void }) {
  const [template, setTemplate] = useState<CanvasTemplate>(() => getCustomTemplate(kind));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  React.useEffect(() => { setTemplate(getCustomTemplate(kind)); setSelectedId(null); }, [kind]);

  const selected = useMemo(() => template.elements.find((e) => e.id === selectedId) ?? null, [template, selectedId]);

  function update(patch: Partial<CanvasTemplate>) { setTemplate((t) => ({ ...t, ...patch })); }
  function updateEl(id: string, patch: Partial<CanvasElement>) {
    setTemplate((t) => ({ ...t, elements: t.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  }
  function removeEl(id: string) {
    setTemplate((t) => ({ ...t, elements: t.elements.filter((e) => e.id !== id) }));
    setSelectedId(null);
  }
  function addEl(type: CanvasElement["type"]) {
    const el = newElement(type);
    setTemplate((t) => ({ ...t, elements: [...t.elements, el] }));
    setSelectedId(el.id);
  }

  function onPointerDown(e: React.PointerEvent, id: string) {
    e.stopPropagation();
    setSelectedId(id);
    const el = template.elements.find((x) => x.id === id);
    if (!el) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = el.x;
    const origY = el.y;
    (e.target as Element).setPointerCapture(e.pointerId);
    function move(ev: PointerEvent) {
      const dx = (ev.clientX - startX) / PX_PER_MM;
      const dy = (ev.clientY - startY) / PX_PER_MM;
      updateEl(id, {
        x: Math.max(0, Math.min(template.pageWidth, origX + dx)),
        y: Math.max(0, Math.min(template.pageHeight, origY + dy)),
      });
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function onResizePointerDown(e: React.PointerEvent, id: string) {
    e.stopPropagation();
    setSelectedId(id);
    const el = template.elements.find((x) => x.id === id);
    if (!el) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const origW = el.w ?? 30;
    const origH = el.h ?? 15;
    (e.target as Element).setPointerCapture(e.pointerId);
    function move(ev: PointerEvent) {
      const dx = (ev.clientX - startX) / PX_PER_MM;
      const dy = (ev.clientY - startY) / PX_PER_MM;
      updateEl(id, { w: Math.max(5, origW + dx), h: Math.max(3, origH + dy) });
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function save() {
    setCustomTemplate(kind, template);
    setStoredDocumentTemplate("custom");

    toast.success("Modèle enregistré. Il sera utilisé pour tous les documents.");
    onSaved?.();
  }

  function reset() {
    resetCustomTemplate(kind);
    setTemplate(getCustomTemplate(kind));
    setSelectedId(null);
    toast.info("Modèle réinitialisé.");
  }

  const canvasWidth = template.pageWidth * PX_PER_MM;
  const canvasHeight = template.pageHeight * PX_PER_MM;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => addEl("text")}><Type className="h-4 w-4 mr-1" />Texte</Button>
          <Button size="sm" variant="outline" onClick={() => addEl("rect")}><Square className="h-4 w-4 mr-1" />Rectangle</Button>
          <Button size="sm" variant="outline" onClick={() => addEl("line")}><Minus className="h-4 w-4 mr-1" />Ligne</Button>
          <Button size="sm" variant="outline" onClick={() => addEl("image")}><ImageIcon className="h-4 w-4 mr-1" />Logo</Button>
          <Button size="sm" variant="outline" onClick={() => addEl("items_table")}><TableIcon className="h-4 w-4 mr-1" />Tableau articles</Button>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="ghost" onClick={reset}><RotateCcw className="h-4 w-4 mr-1" />Réinitialiser</Button>
            <Button size="sm" onClick={save}><Save className="h-4 w-4 mr-1" />Enregistrer</Button>
          </div>
        </div>

        <div className="overflow-auto border rounded bg-muted/30 p-4" style={{ maxHeight: 700 }}>
          <div
            ref={canvasRef}
            onPointerDown={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}
            className="relative mx-auto bg-white shadow"
            style={{ width: canvasWidth, height: canvasHeight }}
          >
            {template.elements.map((el) => {
              const isSel = el.id === selectedId;
              const style: React.CSSProperties = {
                position: "absolute",
                left: el.x * PX_PER_MM,
                top: el.y * PX_PER_MM,
                outline: isSel ? "2px solid #3B82F6" : "1px dashed transparent",
                cursor: "grab",
              };
              if (el.type === "text") {
                const alignT = el.align ?? "left";
                const transform = alignT === "center" ? "translateX(-50%)" : alignT === "right" ? "translateX(-100%)" : undefined;
                return (
                  <div key={el.id} onPointerDown={(e) => onPointerDown(e, el.id)} style={{ ...style, transform, whiteSpace: "nowrap" }}>
                    <span style={{
                      color: el.color ?? "#000",
                      fontSize: (el.fontSize ?? 10) * 1.1,
                      fontWeight: el.bold ? 700 : 400,
                      fontStyle: el.italic ? "italic" : "normal",
                    }}>{el.text}</span>
                  </div>
                );
              }
              if (el.type === "rect") {
                return (
                  <div key={el.id} onPointerDown={(e) => onPointerDown(e, el.id)}
                    style={{ ...style, width: (el.w ?? 40) * PX_PER_MM, height: (el.h ?? 15) * PX_PER_MM, background: el.fill ?? "#E5EDFF" }}>
                    {isSel && <ResizeHandle onPointerDown={(e) => onResizePointerDown(e, el.id)} />}
                  </div>
                );
              }
              if (el.type === "line") {
                return <div key={el.id} onPointerDown={(e) => onPointerDown(e, el.id)}
                  style={{ ...style, width: (el.w ?? 60) * PX_PER_MM, height: Math.max(1, (el.strokeWidth ?? 0.4) * PX_PER_MM), background: el.color ?? "#0B1E3F" }} />;
              }
              if (el.type === "image") {
                return (
                  <div key={el.id} onPointerDown={(e) => onPointerDown(e, el.id)}
                    style={{ ...style, width: (el.w ?? 30) * PX_PER_MM, height: (el.h ?? 15) * PX_PER_MM, background: "#FFF", border: isSel ? undefined : "1px dashed #CBD5E1", overflow: "visible" }}>
                    <img src={logoUrl} alt="Logo" draggable={false}
                      style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none", userSelect: "none" }} />
                    {isSel && <ResizeHandle onPointerDown={(e) => onResizePointerDown(e, el.id)} />}
                  </div>
                );
              }

              if (el.type === "items_table") {
                const cols = el.columns ?? ["name", "qty", "unit", "total"];
                return (
                  <div key={el.id} onPointerDown={(e) => onPointerDown(e, el.id)} style={{ ...style, width: (el.w ?? 100) * PX_PER_MM }}>
                    <div style={{ display: "grid", gridTemplateColumns: `2fr ${cols.slice(1).map(() => "1fr").join(" ")}`, background: el.headerFill ?? "#0B1E3F", color: el.headerColor ?? "#FFF", fontSize: 10, padding: "3px 4px" }}>
                      {cols.map((c) => <div key={c}>{c === "name" ? "Article" : c === "qty" ? "Qt" : c === "unit" ? "P.U." : "Total"}</div>)}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: `2fr ${cols.slice(1).map(() => "1fr").join(" ")}`, fontSize: 10, padding: "3px 4px", borderBottom: "1px solid #E5E7EB", color: "#64748B" }}>
                      {cols.map((c) => <div key={c}>{c === "name" ? "(articles…)" : "…"}</div>)}
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded border p-3 space-y-2">
          <Label className="text-xs uppercase text-muted-foreground">Format de page</Label>
          <Select value={`${template.pageWidth}x${template.pageHeight}`} onValueChange={(v) => { const [w, h] = v.split("x").map(Number); update({ pageWidth: w, pageHeight: h }); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_PRESETS.map((p) => <SelectItem key={p.label} value={`${p.w}x${p.h}`}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Largeur (mm)</Label><Input type="number" value={template.pageWidth} onChange={(e) => update({ pageWidth: Number(e.target.value) || 80 })} /></div>
            <div><Label className="text-xs">Hauteur (mm)</Label><Input type="number" value={template.pageHeight} onChange={(e) => update({ pageHeight: Number(e.target.value) || 220 })} /></div>
          </div>
        </div>

        {selected ? (
          <div className="rounded border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase text-muted-foreground">Élément · {selected.type}</Label>
              <Button size="icon" variant="ghost" onClick={() => removeEl(selected.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">X (mm)</Label><Input type="number" value={selected.x} onChange={(e) => updateEl(selected.id, { x: Number(e.target.value) })} /></div>
              <div><Label className="text-xs">Y (mm)</Label><Input type="number" value={selected.y} onChange={(e) => updateEl(selected.id, { y: Number(e.target.value) })} /></div>
            </div>
            {(selected.type === "rect" || selected.type === "image" || selected.type === "items_table" || selected.type === "line") && (
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">L (mm)</Label><Input type="number" value={selected.w ?? 0} onChange={(e) => updateEl(selected.id, { w: Number(e.target.value) })} /></div>
                {selected.type !== "line" && <div><Label className="text-xs">H (mm)</Label><Input type="number" value={selected.h ?? 0} onChange={(e) => updateEl(selected.id, { h: Number(e.target.value) })} /></div>}
              </div>
            )}

            {selected.type === "text" && (
              <>
                <div>
                  <Label className="text-xs">Texte</Label>
                  <Input value={selected.text ?? ""} onChange={(e) => updateEl(selected.id, { text: e.target.value })} />
                  <div className="mt-1 flex flex-wrap gap-1">
                    {AVAILABLE_VARIABLES.map((v) => (
                      <button key={v} type="button" className="text-[10px] rounded bg-muted px-1.5 py-0.5 hover:bg-primary hover:text-primary-foreground"
                        onClick={() => updateEl(selected.id, { text: (selected.text ?? "") + `{{${v}}}` })}>{`{{${v}}}`}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Taille (pt)</Label><Input type="number" value={selected.fontSize ?? 10} onChange={(e) => updateEl(selected.id, { fontSize: Number(e.target.value) })} /></div>
                  <div><Label className="text-xs">Couleur</Label><Input type="color" value={selected.color ?? "#000000"} onChange={(e) => updateEl(selected.id, { color: e.target.value })} /></div>
                </div>
                <div>
                  <Label className="text-xs">Alignement</Label>
                  <Select value={selected.align ?? "left"} onValueChange={(v) => updateEl(selected.id, { align: v as CanvasElement["align"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Gauche</SelectItem>
                      <SelectItem value="center">Centré</SelectItem>
                      <SelectItem value="right">Droite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!selected.bold} onCheckedChange={(v) => updateEl(selected.id, { bold: !!v })} />Gras</label>
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!selected.italic} onCheckedChange={(v) => updateEl(selected.id, { italic: !!v })} />Italique</label>
                </div>
              </>
            )}

            {selected.type === "rect" && (
              <div><Label className="text-xs">Remplissage</Label><Input type="color" value={selected.fill ?? "#E5EDFF"} onChange={(e) => updateEl(selected.id, { fill: e.target.value })} /></div>
            )}
            {selected.type === "line" && (
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Couleur</Label><Input type="color" value={selected.color ?? "#0B1E3F"} onChange={(e) => updateEl(selected.id, { color: e.target.value })} /></div>
                <div><Label className="text-xs">Épaisseur</Label><Input type="number" step="0.1" value={selected.strokeWidth ?? 0.4} onChange={(e) => updateEl(selected.id, { strokeWidth: Number(e.target.value) })} /></div>
              </div>
            )}
            {selected.type === "items_table" && (
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Fond en-tête</Label><Input type="color" value={selected.headerFill ?? "#0B1E3F"} onChange={(e) => updateEl(selected.id, { headerFill: e.target.value })} /></div>
                <div><Label className="text-xs">Texte en-tête</Label><Input type="color" value={selected.headerColor ?? "#FFFFFF"} onChange={(e) => updateEl(selected.id, { headerColor: e.target.value })} /></div>
                <div className="col-span-2"><Label className="text-xs">Taille texte</Label><Input type="number" value={selected.fontSize ?? 9} onChange={(e) => updateEl(selected.id, { fontSize: Number(e.target.value) })} /></div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded border border-dashed p-4 text-center text-sm text-muted-foreground">
            Sélectionnez un élément du canvas pour l'éditer, ou ajoutez-en un depuis la barre d'outils.
          </div>
        )}

        <div className="rounded border p-3 text-xs text-muted-foreground space-y-1">
          <div className="font-semibold text-foreground">Variables disponibles</div>
          <div className="flex flex-wrap gap-1">
            {AVAILABLE_VARIABLES.map((v) => <code key={v} className="rounded bg-muted px-1">{`{{${v}}}`}</code>)}
          </div>
          <p>Elles sont remplacées automatiquement lors de la génération du document (POS, caisse, factures…).</p>
        </div>
      </div>

      <div className="min-h-[600px] xl:block">
        <TemplatePreview template={template} docLabel={kind === "facture" ? "Facture" : "Reçu"} />
      </div>
    </div>
  );
}

export default EditorCanvas;
