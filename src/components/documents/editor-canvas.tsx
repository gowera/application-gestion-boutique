"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { setCustomTemplate, getCustomTemplate, setStoredDocumentTemplate } from "@/lib/document-template";

type ElementType = {
  id: string;
  type: "text" | "rect";
  x: number;
  y: number;
  w?: number;
  h?: number;
  text?: string;
  color?: string;
  fontSize?: number;
};

export function EditorCanvas({ onSaved }: { onSaved?: () => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [elements, setElements] = useState<ElementType[]>(() => getCustomTemplate()?.elements ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => { setElements(getCustomTemplate()?.elements ?? []); }, []);

  function addText() {
    const el: ElementType = { id: crypto.randomUUID(), type: "text", x: 20, y: 20, text: "Texte", color: "#000000", fontSize: 12 };
    setElements((s) => [...s, el]);
    setSelectedId(el.id);
  }

  function addRect() {
    const el: ElementType = { id: crypto.randomUUID(), type: "rect", x: 10, y: 10, w: 60, h: 20, color: "#eeeeee" };
    setElements((s) => [...s, el]);
    setSelectedId(el.id);
  }

  function updateEl(id: string, patch: Partial<ElementType>) {
    setElements((s) => s.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function save() {
    const payload = { width: 800, height: 1120, elements };
    setCustomTemplate(payload as any);
    setStoredDocumentTemplate("custom");
    if (onSaved) onSaved();
  }

  // Basic drag handling
  function onPointerDown(e: React.PointerEvent, id: string) {
    const startX = e.clientX;
    const startY = e.clientY;
    const el = elements.find((x) => x.id === id);
    if (!el) return;
    const origX = el.x;
    const origY = el.y;
    setSelectedId(id);
    (e.target as Element).setPointerCapture(e.pointerId);
    function move(ev: PointerEvent) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      updateEl(id, { x: Math.max(0, origX + dx), y: Math.max(0, origY + dy) });
    }
    function up(ev: PointerEvent) {
      (e.target as Element).releasePointerCapture(e.pointerId);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button onClick={addText}>Ajouter texte</Button>
        <Button onClick={addRect}>Ajouter zone</Button>
        <Button variant="secondary" onClick={() => { setElements([]); }} >Réinitialiser</Button>
        <div className="ml-auto" />
        <Button onClick={save}>Enregistrer le modèle</Button>
      </div>
      <div ref={containerRef} className="border p-2 bg-white" style={{ width: 420, height: 594, position: "relative" }}>
        {elements.map((el) => (
          <div key={el.id} onPointerDown={(e) => onPointerDown(e, el.id)} style={{ position: "absolute", left: el.x, top: el.y, cursor: "grab", userSelect: "none" }}>
            {el.type === "text" ? (
              <div style={{ color: el.color || "#000", fontSize: (el.fontSize ?? 12) }}>{el.text}</div>
            ) : (
              <div style={{ width: el.w ?? 80, height: el.h ?? 30, background: el.color ?? "#eee", border: "1px solid #ccc" }} />
            )}
          </div>
        ))}
      </div>
      {selectedId && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm">Texte</label>
            <input className="w-full border p-1" value={elements.find((e) => e.id === selectedId)?.text ?? ""} onChange={(e) => updateEl(selectedId, { text: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm">Couleur</label>
            <input type="color" className="w-full" value={elements.find((e) => e.id === selectedId)?.color ?? "#000000"} onChange={(e) => updateEl(selectedId, { color: e.target.value })} />
          </div>
        </div>
      )}
    </div>
  );
}

export default EditorCanvas;
