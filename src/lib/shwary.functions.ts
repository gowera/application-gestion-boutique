import { createServerFn } from "@tanstack/react-start";

type ShwaryCreds = {
  merchant_id: string;
  merchant_key: string;
  sandbox: boolean;
};

async function loadCreds(): Promise<ShwaryCreds | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("payment_credentials")
    .select("merchant_id, merchant_key, sandbox")
    .eq("provider", "shwary")
    .maybeSingle();
  if (!data || !data.merchant_id || !data.merchant_key) return null;
  return data as ShwaryCreds;
}

export const initiateShwaryPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { orderId: string; phone: string }) => {
    if (!input?.orderId || !input?.phone) throw new Error("orderId et phone requis");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error: oErr } = await supabaseAdmin
      .from("online_orders")
      .select("id, code, total_usd, paid, payment_status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (oErr || !order) throw new Error("Commande introuvable");
    if (order.paid) throw new Error("Commande déjà payée");

    const creds = await loadCreds();
    if (!creds) throw new Error("Shwary non configuré");

    // Load rate for USD -> CDF conversion
    const { data: settings } = await supabaseAdmin.from("settings").select("usd_to_cdf_rate").eq("id", 1).maybeSingle();
    const rate = Number(settings?.usd_to_cdf_rate ?? 2800);
    const amountCdf = Math.max(2900, Math.round(Number(order.total_usd) * rate));

    let phone = data.phone.replace(/\s+/g, "");
    if (!phone.startsWith("+")) {
      if (phone.startsWith("00")) phone = "+" + phone.slice(2);
      else if (phone.startsWith("0")) phone = "+243" + phone.slice(1);
      else phone = "+243" + phone;
    }

    const origin = process.env.PUBLIC_APP_URL || "https://project--265340c6-f4cb-4a09-8b9b-e443b084fee4.lovable.app";
    const callbackUrl = `${origin}/api/public/shwary/callback`;

    const endpoint = creds.sandbox
      ? "https://api.shwary.com/api/v1/merchants/payment/sandbox/DRC"
      : "https://api.shwary.com/api/v1/merchants/payment/DRC";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-merchant-id": creds.merchant_id,
        "x-merchant-key": creds.merchant_key,
      },
      body: JSON.stringify({ amount: amountCdf, clientPhoneNumber: phone, callbackUrl }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (body as { message?: string })?.message || `Erreur Shwary (${res.status})`;
      throw new Error(msg);
    }

    const tx = body as { id: string; status: string };
    await supabaseAdmin
      .from("online_orders")
      .update({
        payment_provider: "shwary",
        payment_ref: tx.id,
        payment_status: tx.status ?? "pending",
        payment_method: "mobile_money",
      })
      .eq("id", data.orderId);

    return { transactionId: tx.id, status: tx.status ?? "pending" };
  });

/** Interroge directement Shwary pour connaître l'état d'une transaction. */
async function fetchRemoteStatus(ref: string, creds: ShwaryCreds): Promise<string | null> {
  const base = "https://api.shwary.com/api/v1/merchants";
  const paths = creds.sandbox
    ? [`${base}/payment/sandbox/${ref}`, `${base}/payment/${ref}`, `${base}/transactions/${ref}`]
    : [`${base}/payment/${ref}`, `${base}/transactions/${ref}`];
  for (const url of paths) {
    try {
      const res = await fetch(url, {
        headers: { "x-merchant-id": creds.merchant_id, "x-merchant-key": creds.merchant_key },
      });
      if (!res.ok) continue;
      const body = (await res.json().catch(() => null)) as { status?: string; data?: { status?: string } } | null;
      const status = body?.status ?? body?.data?.status;
      if (typeof status === "string" && status) return status.toLowerCase();
    } catch { /* endpoint suivant */ }
  }
  return null;
}

export const getOrderPaymentStatus = createServerFn({ method: "GET" })
  .inputValidator((input: { code: string }) => {
    if (!input?.code) throw new Error("code requis");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("online_orders")
      .select("id, payment_status, paid, status, payment_ref")
      .eq("code", data.code)
      .maybeSingle();
    if (!order) return { payment_status: null, paid: false, status: null };

    // Le webhook Shwary peut tarder : on interroge activement l'API.
    if (!order.paid && order.payment_ref && !["failed", "cancelled"].includes(String(order.payment_status))) {
      const creds = await loadCreds();
      if (creds) {
        const remote = await fetchRemoteStatus(order.payment_ref as string, creds);
        if (remote && remote !== order.payment_status) {
          const update: Record<string, unknown> = { payment_status: remote };
          if (["completed", "success", "successful", "paid"].includes(remote)) {
            update.paid = true;
            update.status = "confirmed";
          }
          await supabaseAdmin.from("online_orders").update(update as never).eq("id", order.id);
          return {
            payment_status: remote,
            paid: Boolean(update.paid),
            status: (update.status as string) ?? order.status,
          };
        }
      }
    }
    return { payment_status: order.payment_status, paid: order.paid, status: order.status };
  });

/** Annule une commande dont le paiement Mobile Money n'a pas abouti. */
export const cancelUnpaidOrder = createServerFn({ method: "POST" })
  .inputValidator((input: { orderId: string; reason?: string }) => {
    if (!input?.orderId) throw new Error("orderId requis");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("online_orders")
      .select("id, paid")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order || order.paid) return { cancelled: false };
    await supabaseAdmin
      .from("online_orders")
      .update({ status: "cancelled", payment_status: data.reason ?? "failed" })
      .eq("id", data.orderId);
    return { cancelled: true };
  });
