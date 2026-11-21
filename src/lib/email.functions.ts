import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  message: z.string().max(4000).default(""),
  filename: z.string().min(1),
  pdfBase64: z.string().min(1),
});

export type SendDocumentEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; reason: "not_configured" | "provider_error"; detail?: string };

/** Envoie un document PDF en pièce jointe au client. */
export const sendDocumentEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }): Promise<SendDocumentEmailResult> => {
    const apiKey = process.env["RESEND_API_KEY"];
    if (!apiKey) return { ok: false, reason: "not_configured" };
    const from = process.env["DOCUMENT_EMAIL_FROM"] ?? "Gestion Stock <onboarding@resend.dev>";

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from,
        to: [data.to],
        subject: data.subject,
        text: data.message || "Veuillez trouver votre document en pièce jointe.",
        attachments: [{ filename: data.filename, content: data.pdfBase64 }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return { ok: false, reason: "provider_error", detail: detail.slice(0, 300) };
    }
    const body = (await response.json()) as { id?: string };
    return { ok: true, id: body.id ?? null };
  });
