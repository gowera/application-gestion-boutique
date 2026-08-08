import { createServerFn } from "@tanstack/react-start";

export const initiateShwaryPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { orderId: string; phone: string }) => {
    if (!input?.orderId || !input?.phone) throw new Error("orderId et phone requis");
    return input;
  })
  .handler(async ({ data }) => {
    const { serverClient, rpcSecret, loadCreds } = await import("@/lib/shwary.server");
    const sb = serverClient();
    const secret = rpcSecret();

    const { data: order, error: oErr } = await sb.rpc("shwary_get_order", {
      _secret: secret,
      _order_id: data.orderId,
    });
    if (oErr) throw new Error(oErr.message);
    const o = order as { total_usd: number; paid: boolean; rate: number } | null;
    if (!o) throw new Error("Commande introuvable");
    if (o.paid) throw new Error("Commande déjà payée");

    const creds = await loadCreds();
    if (!creds) throw new Error("Shwary non configuré");

    const rate = Number(o.rate ?? 2800);
    const amountCdf = Math.max(2900, Math.round(Number(o.total_usd) * rate));

    let phone = data.phone.replace(/\s+/g, "");
    if (!phone.startsWith("+")) {
      if (phone.startsWith("00")) phone = "+" + phone.slice(2);
      else if (phone.startsWith("0")) phone = "+243" + phone.slice(1);
      else phone = "+243" + phone;
    }

    const origin = process.env['PUBLIC_APP_URL'] || "https://project--265340c6-f4cb-4a09-8b9b-e443b084fee4.lovable.app";
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
    await sb.rpc("shwary_set_ref", {
      _secret: secret,
      _order_id: data.orderId,
      _ref: tx.id,
      _status: tx.status ?? "pending",
    });

    return { transactionId: tx.id, status: tx.status ?? "pending" };
  });

export const getOrderPaymentStatus = createServerFn({ method: "GET" })
  .inputValidator((input: { code: string }) => {
    if (!input?.code) throw new Error("code requis");
    return input;
  })
  .handler(async ({ data }) => {
    const { serverClient, rpcSecret, loadCreds, fetchRemoteStatus } = await import("@/lib/shwary.server");
    const sb = serverClient();
    const secret = rpcSecret();

    const { data: raw } = await sb.rpc("shwary_get_order_by_code", { _secret: secret, _code: data.code });
    const order = raw as {
      id: string; payment_status: string | null; paid: boolean; status: string | null; payment_ref: string | null;
    } | null;
    if (!order) return { payment_status: null, paid: false, status: null };

    // Le webhook Shwary peut tarder : on interroge activement l'API.
    if (!order.paid && order.payment_ref && !["failed", "cancelled"].includes(String(order.payment_status))) {
      const creds = await loadCreds();
      if (creds) {
        const remote = await fetchRemoteStatus(order.payment_ref, creds);
        if (remote && remote !== order.payment_status) {
          const { data: applied } = await sb.rpc("shwary_apply_status", {
            _secret: secret,
            _order_id: order.id,
            _ref: order.payment_ref,
            _status: remote,
            _reason: null,
          });
          const a = applied as { paid?: boolean; status?: string; payment_status?: string } | null;
          if (a) return { payment_status: a.payment_status ?? remote, paid: Boolean(a.paid), status: a.status ?? order.status };
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
    const { serverClient, rpcSecret } = await import("@/lib/shwary.server");
    const sb = serverClient();
    const secret = rpcSecret();
    const { data: raw } = await sb.rpc("shwary_get_order", { _secret: secret, _order_id: data.orderId });
    const o = raw as { paid?: boolean } | null;
    if (!o || o.paid) return { cancelled: false };
    await sb.rpc("shwary_apply_status", {
      _secret: secret,
      _order_id: data.orderId,
      _ref: null,
      _status: data.reason ?? "failed",
      _reason: data.reason ?? null,
    });
    return { cancelled: true };
  });
