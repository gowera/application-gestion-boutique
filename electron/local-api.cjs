const crypto = require("node:crypto");

function response(status, body, headers = {}) {
  return {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
    body: body === undefined ? "" : JSON.stringify(body),
  };
}

function splitSelection(selection) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < selection.length; index += 1) {
    if (selection[index] === "(") depth += 1;
    else if (selection[index] === ")") depth -= 1;
    else if (selection[index] === "," && depth === 0) {
      parts.push(selection.slice(start, index).trim());
      start = index + 1;
    }
  }
  if (selection.slice(start).trim()) parts.push(selection.slice(start).trim());
  return parts;
}

function parseSelectionToken(token) {
  const match = token.match(/^([^:(]+)(?:\((.*)\))?$/);
  if (!match) return null;
  const relation = match[1].split(":").pop().split("!")[0];
  return { relation, nested: match[2] };
}

function singular(table) {
  if (table.endsWith("ies")) return `${table.slice(0, -3)}y`;
  if (table.endsWith("s")) return table.slice(0, -1);
  return table;
}

function foreignKeys(parentTable, childTable) {
  const targetSingular = singular(childTable);
  const parentSingular = singular(parentTable);
  const parentHas = [
    `${targetSingular}_id`,
    `${childTable}_id`,
    ...(childTable === "expense_categories" ? ["category_id"] : []),
  ];
  const childHas = [`${parentSingular}_id`, `${parentTable}_id`];
  return { parentHas, childHas };
}

function parseFilter(raw) {
  const split = raw.indexOf(".");
  if (split < 0) return null;
  let operator = raw.slice(0, split);
  let value = raw.slice(split + 1);
  if (operator === "not") {
    const nested = value.indexOf(".");
    if (nested < 0) return null;
    operator = `not.${value.slice(0, nested)}`;
    value = value.slice(nested + 1);
  }
  if (value.startsWith("(") && value.endsWith(")")) {
    value = value.slice(1, -1).split(",").map((part) => part.replace(/^"|"$/g, ""));
  } else if (value === "null") {
    value = null;
  } else if (value === "true") {
    value = true;
  } else if (value === "false") {
    value = false;
  }
  return { operator, value };
}

function matches(row, searchParams) {
  for (const [column, raw] of searchParams) {
    if (["select", "order", "limit", "offset", "on_conflict"].includes(column)) continue;
    if (column === "or" || column === "and") {
      throw new Error(`Le filtre « ${column} » n’est pas encore pris en charge en mode local.`);
    }
    const filter = parseFilter(raw);
    if (!filter) throw new Error(`Le filtre « ${column} » est invalide en mode local.`);
    const actual = row[column];
    const expected = filter.value;
    let result = true;
    switch (filter.operator) {
      case "eq": result = actual === expected || String(actual) === String(expected); break;
      case "neq": result = actual !== expected && String(actual) !== String(expected); break;
      case "gt": result = actual > expected; break;
      case "gte": result = actual >= expected; break;
      case "lt": result = actual < expected; break;
      case "lte": result = actual <= expected; break;
      case "is": result = expected === null ? actual === null || actual === undefined : actual === expected; break;
      case "not.is": result = expected === null ? actual !== null && actual !== undefined : actual !== expected; break;
      case "in": result = Array.isArray(expected) && expected.some((value) => String(value) === String(actual)); break;
      case "not.in": result = Array.isArray(expected) && !expected.some((value) => String(value) === String(actual)); break;
      case "like":
      case "ilike": {
        const pattern = String(expected).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".");
        result = new RegExp(`^${pattern}$`, filter.operator === "ilike" ? "i" : "").test(String(actual ?? ""));
        break;
      }
      default: throw new Error(`L’opérateur « ${filter.operator} » n’est pas pris en charge en mode local.`);
    }
    if (!result) return false;
  }
  return true;
}

function applyRelations(rows, table, selection, readTable, depth = 0) {
  if (depth > 3 || !selection) return rows;
  const relations = splitSelection(selection)
    .map(parseSelectionToken)
    .filter((token) => token?.nested !== undefined);
  if (!relations.length) return rows;
  return rows.map((row) => {
    const result = { ...row };
    for (const { relation, nested } of relations) {
      const related = readTable(relation);
      const { parentHas, childHas } = foreignKeys(table, relation);
      const parentKey = parentHas.find((key) => Object.prototype.hasOwnProperty.call(row, key));
      if (parentKey) {
        const relatedRow = related.find((candidate) => String(candidate.id) === String(row[parentKey]));
        result[relation] = relatedRow ? applyRelations([relatedRow], relation, nested, readTable, depth + 1)[0] : null;
      } else {
        const foreignKey = childHas.find((key) => related.some((candidate) => Object.prototype.hasOwnProperty.call(candidate, key)));
        const matching = foreignKey ? related.filter((candidate) => String(candidate[foreignKey]) === String(row.id)) : [];
        result[relation] = applyRelations(matching, relation, nested, readTable, depth + 1);
      }
    }
    return result;
  });
}

function defaultRow(row, table) {
  const now = new Date().toISOString();
  const tableDefaults = {
    products: { stock: 0, status: "active", images: [] },
    customers: { balance: 0, credit_limit: 0, is_archived: false },
    categories: { is_active: true, sort_order: 0 },
    notifications: { is_read: false },
    employees: { active: true, is_terminated: false },
  };
  const defaults = tableDefaults[table] ?? {};
  return {
    ...defaults,
    ...row,
    id: row.id ?? crypto.randomUUID(),
    created_at: row.created_at ?? now,
    updated_at: row.updated_at ?? now,
  };
}

function insertRow(db, userId, table, row) {
  const rows = readTable(db, userId, table);
  const next = defaultRow(row, table);
  rows.push(next);
  writeTable(db, userId, table, rows);
  return next;
}

function applyLocalOperation(kind, payload, db, userId) {
  const now = new Date().toISOString();
  if (kind === "stock_adjust") {
    const products = readTable(db, userId, "products");
    const product = products.find((row) => row.id === payload.product_id);
    if (!product) throw new Error("Produit introuvable dans les données locales.");
    const delta = Number(payload.delta ?? 0);
    product.stock = Number(product.stock ?? 0) + delta;
    writeTable(db, userId, "products", products);
    insertRow(db, userId, "stock_movements", {
      product_id: product.id,
      delta,
      reason: payload.reason ?? "manual_adjustment",
      note: payload.note ?? null,
      created_at: now,
    });
    return product.id;
  }
  if (kind === "customer_ledger") {
    let customer = payload.customer_id
      ? readTable(db, userId, "customers").find((row) => row.id === payload.customer_id)
      : null;
    if (!customer && payload.customer_name) {
      customer = insertRow(db, userId, "customers", {
        name: payload.customer_name,
        phone: payload.customer_phone ?? null,
        email: null,
        balance: 0,
        credit_limit: 0,
        is_archived: false,
      });
    }
    if (!customer) throw new Error("Client introuvable dans les données locales.");
    const delta = Number(payload.delta ?? 0);
    const customers = readTable(db, userId, "customers");
    const index = customers.findIndex((row) => row.id === customer.id);
    customers[index] = { ...customers[index], balance: Number(customers[index].balance ?? 0) + delta, updated_at: now };
    writeTable(db, userId, "customers", customers);
    return insertRow(db, userId, "customer_ledger", {
      customer_id: customer.id,
      delta,
      reason: payload.reason ?? "local_entry",
      due_date: payload.due_date ?? null,
      created_at: now,
    }).id;
  }
  if (kind === "pos_sale") {
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (!items.length) throw new Error("La vente locale ne contient aucun article.");
    const products = readTable(db, userId, "products");
    const saleItems = items.map((item) => {
      const product = products.find((row) => row.id === item.product_id);
      if (!product) throw new Error("Un produit de la vente est introuvable localement.");
      const quantity = Number(item.qty ?? 0);
      if (quantity <= 0 || Number(product.stock ?? 0) < quantity) throw new Error(`Stock insuffisant : ${product.name ?? item.product_id}`);
      const unit = Number(item.unit_price_usd ?? product.sale_price ?? 0);
      const discount = Number(item.discount_usd ?? 0);
      return { item, product, quantity, unit, discount, lineTotal: quantity * unit - discount };
    });
    const subtotal = saleItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const discount = Number(payload.discount_usd ?? 0);
    const total = Math.max(0, subtotal - discount);
    const payments = Array.isArray(payload.payments) ? payload.payments : [];
    const settings = readTable(db, userId, "shop_settings")[0] ?? {};
    const rate = Number(settings.usd_to_cdf_rate ?? 2800);
    const paid = payments.reduce((sum, payment) => {
      const amount = Number(payment.amount ?? 0);
      return sum + (payment.currency === "CDF" ? amount / rate : amount);
    }, 0);
    const saleId = crypto.randomUUID();
    const sale = insertRow(db, userId, "sales", {
      id: saleId,
      code: `LOCAL-${Date.now()}`,
      customer_id: payload.customer_id ?? null,
      subtotal_usd: subtotal,
      discount_usd: discount,
      total_usd: total,
      paid_usd: paid,
      credit_usd: Math.max(0, total - paid),
      due_date: payload.due_date ?? null,
      note: payload.note ?? null,
      status: "completed",
      created_at: now,
    });
    for (const { item, product, quantity, unit, discount: lineDiscount, lineTotal } of saleItems) {
      product.stock = Number(product.stock ?? 0) - quantity;
      insertRow(db, userId, "sale_items", {
        sale_id: sale.id,
        product_id: product.id,
        product_name: product.name,
        qty: quantity,
        unit_price_usd: unit,
        discount_usd: lineDiscount,
        line_total_usd: lineTotal,
      });
      insertRow(db, userId, "stock_movements", {
        product_id: product.id,
        delta: -quantity,
        reason: "sale",
        reference_id: sale.id,
        created_at: now,
      });
    }
    writeTable(db, userId, "products", products);
    for (const payment of payments) {
      const amount = Number(payment.amount ?? 0);
      insertRow(db, userId, "payments", {
        sale_id: sale.id,
        method: payment.method,
        amount,
        currency: payment.currency,
        amount_usd: payment.currency === "CDF" ? amount / rate : amount,
        reference: payment.reference ?? null,
      });
    }
    if (sale.credit_usd > 0 && sale.customer_id) {
      const customers = readTable(db, userId, "customers");
      const customerIndex = customers.findIndex((row) => row.id === sale.customer_id);
      if (customerIndex >= 0) {
        customers[customerIndex] = { ...customers[customerIndex], balance: Number(customers[customerIndex].balance ?? 0) + sale.credit_usd };
        writeTable(db, userId, "customers", customers);
        insertRow(db, userId, "customer_ledger", {
          customer_id: sale.customer_id,
          delta: sale.credit_usd,
          reason: "Vente locale",
          ref_id: sale.id,
          due_date: payload.due_date ?? null,
        });
      }
    }
    return sale.id;
  }
  if (kind === "expense") return insertRow(db, userId, "expenses", payload).id;
  if (kind === "customer") return insertRow(db, userId, "customers", payload).id;
  if (kind === "document") {
    const document = issueDocument(payload, db, userId);
    for (const item of payload.stock_items ?? []) {
      adjustStock(item.product_id, -Number(item.qty ?? 0), "document", `Document ${document.code}`, db, userId);
    }
    return { result: document };
  }
  throw new Error(`Type d’opération locale inconnu : ${kind}`);
}

function adjustStock(productId, delta, reason, note, db, userId) {
  return applyLocalOperation("stock_adjust", {
    product_id: productId,
    delta,
    reason,
    note,
  }, db, userId);
}

function issueDocument(args, db, userId) {
  const documentKind = args.document_kind === "monthly" || args.document_kind === "proforma"
    ? args.document_kind
    : "standard";
  const docType = args.doc_type === "recu" || args._doc_type === "recu" ? "recu" : "facture";
  const year = new Date().getFullYear();
  const rows = readTable(db, userId, "document_registry");
  if (documentKind === "monthly") {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(args.billing_period ?? ""))) {
      throw new Error("La période de facturation mensuelle est invalide.");
    }
    const duplicate = rows.some((row) => row.document_kind === "monthly"
      && row.billing_period === args.billing_period
      && (args.customer_id
        ? row.customer_id === args.customer_id
        : row.customer_name === args.customer_name));
    if (duplicate) throw new Error("Une facture existe déjà pour ce client et cette période.");
  }
  if (documentKind === "proforma") {
    if (!args.code || rows.some((row) => row.code === args.code)) {
      throw new Error("Le numéro de la facture proforma est invalide ou déjà utilisé.");
    }
    const record = insertRow(db, userId, "document_registry", {
      ...documentFields(args, documentKind),
      doc_type: "facture",
      number: null,
      year,
      code: args.code,
    });
    return { id: record.id, code: record.code, number: null, doc_type: "facture", year };
  }
  const number = rows
    .filter((row) => row.doc_type === docType && Number(row.year) === year)
    .reduce((max, row) => Math.max(max, Number(row.number) || 0), 0) + 1;
  const prefix = docType === "facture" ? "FAC" : "REC";
  const record = insertRow(db, userId, "document_registry", {
    ...documentFields(args, documentKind),
    doc_type: docType,
    number,
    year,
    code: `${prefix}-${year}-${String(number).padStart(4, "0")}`,
  });
  return { id: record.id, code: record.code, number, doc_type: docType, year };
}

function documentFields(args, documentKind) {
  return {
    document_kind: documentKind,
    sale_id: args.sale_id ?? args._sale_id ?? null,
    customer_id: args.customer_id ?? null,
    customer_name: args.customer_name ?? args._customer_name ?? null,
    billing_period: args.billing_period ?? null,
    items: Array.isArray(args.items) ? args.items : [],
    subtotal_usd: Number(args.subtotal_usd ?? args.total_usd ?? args._total_usd ?? 0),
    discount_usd: Number(args.discount_usd ?? 0),
    total_usd: Number(args.total_usd ?? args._total_usd ?? 0),
    paid_usd: Number(args.paid_usd ?? 0),
    credit_usd: Number(args.credit_usd ?? args.total_usd ?? args._total_usd ?? 0),
    note: args.note ?? null,
  };
}

function handleRpc(name, args, db, userId) {
  if (name === "log_auth_event") return response(200, null);
  if (name === "current_shop_id") {
    const settings = readTable(db, userId, "shop_settings");
    return response(200, settings[0]?.shop_id ?? userId);
  }
  if (name === "check_invitation") return response(200, null);
  if (name === "adjust_stock") {
    try {
      return response(200, adjustStock(args._product_id, args._delta, args._reason, args._note, db, userId));
    } catch (error) {
      return response(400, { message: error instanceof Error ? error.message : String(error) });
    }
  }
  if (name === "issue_document_number") {
    try {
      return response(200, issueDocument(args, db, userId));
    } catch (error) {
      return response(400, { message: error instanceof Error ? error.message : String(error) });
    }
  }
  if (name === "sync_apply_operation") {
    try {
      return response(200, applyLocalOperation(args._kind, args._payload ?? {}, db, userId));
    } catch (error) {
      return response(400, { message: error instanceof Error ? error.message : String(error) });
    }
  }
  if (name === "record_customer_payment") {
    const customers = readTable(db, userId, "customers");
    const index = customers.findIndex((row) => row.id === args._customer_id);
    const amount = Number(args._amount ?? 0);
    if (index < 0 || amount <= 0 || amount > Number(customers[index]?.balance ?? 0)) {
      return response(400, { message: "Client ou montant de paiement invalide." });
    }
    customers[index] = { ...customers[index], balance: Number(customers[index].balance ?? 0) - amount, updated_at: new Date().toISOString() };
    writeTable(db, userId, "customers", customers);
    insertRow(db, userId, "customer_ledger", {
      customer_id: args._customer_id,
      delta: -amount,
      reason: args._note ?? "remboursement",
      method: args._method ?? "cash",
    });
    return response(200, null);
  }
  if (name === "cancel_sale") {
    const sales = readTable(db, userId, "sales");
    const sale = sales.find((row) => row.id === args._sale_id);
    if (!sale || sale.status === "cancelled") return response(400, { message: "Vente introuvable ou déjà annulée localement." });
    const saleItems = readTable(db, userId, "sale_items").filter((row) => row.sale_id === sale.id);
    for (const item of saleItems) {
      if (item.product_id) adjustStock(item.product_id, Number(item.qty ?? 0), "sale_cancelled", `Annulation ${sale.code ?? sale.id}`, db, userId);
    }
    const currentSales = readTable(db, userId, "sales");
    const saleIndex = currentSales.findIndex((row) => row.id === sale.id);
    currentSales[saleIndex] = { ...currentSales[saleIndex], status: "cancelled", updated_at: new Date().toISOString() };
    writeTable(db, userId, "sales", currentSales);
    return response(200, null);
  }
  if (name === "receive_purchase") {
    const purchases = readTable(db, userId, "purchases");
    const purchase = purchases.find((row) => row.id === args._purchase_id);
    if (!purchase) return response(400, { message: "Achat introuvable dans les données locales." });
    const items = readTable(db, userId, "purchase_items").filter((row) => row.purchase_id === purchase.id);
    if (items.some((item) => !item.product_id)) {
      return response(400, { message: "Un article de cet achat n’est pas relié à un produit local." });
    }
    for (const item of items) {
      adjustStock(item.product_id, Number(item.qty ?? 0), "purchase_received", `Réception ${purchase.code ?? purchase.id}`, db, userId);
    }
    const index = purchases.findIndex((row) => row.id === purchase.id);
    purchases[index] = { ...purchases[index], status: "received", received_at: new Date().toISOString() };
    writeTable(db, userId, "purchases", purchases);
    return response(200, null);
  }
  if (name === "next_intervention_code") {
    const rows = readTable(db, userId, "interventions");
    const next = rows.reduce((max, row) => {
      const number = Number(String(row.code ?? "").replace(/\D/g, ""));
      return Number.isFinite(number) ? Math.max(max, number) : max;
    }, 0) + 1;
    return response(200, `INT-${String(next).padStart(4, "0")}`);
  }
  if (name === "issue_document_number") {
    return response(200, issueDocument(args, db, userId));
  }
  return response(501, { code: "LOCAL_FEATURE_UNAVAILABLE", message: `La fonction « ${name} » n’est pas disponible en mode local.` });
}

function readTable(db, userId, table) {
  const entry = db.get(`user:${userId}:cache:table:${table}`);
  return Array.isArray(entry?.data) ? entry.data : [];
}

function writeTable(db, userId, table, rows) {
  db.set(`user:${userId}:cache:table:${table}`, { data: rows, at: new Date().toISOString() });
}

function handleTableRequest(url, method, headers, body, db, userId) {
  const table = decodeURIComponent(url.pathname.split("/").pop() ?? "");
  if (!/^[a-z][a-z0-9_]*$/i.test(table)) return response(400, { message: "Nom de table local invalide." });
  let rows = readTable(db, userId, table);
  const prefer = headers.get("prefer") ?? "";
  const returnsRows = /return=representation/i.test(prefer);
  let changed = [];

  if (method === "GET" || method === "HEAD") {
    changed = rows.filter((row) => matches(row, url.searchParams));
    const order = url.searchParams.get("order");
    if (order) {
      const fields = order.split(",");
      changed = [...changed].sort((a, b) => {
        for (const field of fields) {
          const [name, direction] = field.trim().split(".");
          const left = a[name];
          const right = b[name];
          if (left === right) continue;
          if (left == null) return direction === "desc" ? 1 : -1;
          if (right == null) return direction === "desc" ? -1 : 1;
          const comparison = typeof left === "number" && typeof right === "number"
            ? left - right
            : String(left).localeCompare(String(right));
          if (comparison) return direction === "desc" ? -comparison : comparison;
        }
        return 0;
      });
    }
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const limit = Number(url.searchParams.get("limit") ?? changed.length);
    changed = changed.slice(Number.isFinite(offset) ? offset : 0, (Number.isFinite(offset) ? offset : 0) + (Number.isFinite(limit) ? limit : changed.length));
    changed = applyRelations(changed, table, url.searchParams.get("select"), (name) => readTable(db, userId, name));
  } else if (method === "POST") {
    const inputRows = Array.isArray(body) ? body : [body];
    if (inputRows.some((row) => !row || typeof row !== "object" || Array.isArray(row))) {
      return response(400, { message: "Les données à enregistrer sont invalides." });
    }
    const conflictColumns = (url.searchParams.get("on_conflict") ?? "id").split(",");
    changed = inputRows.map((row) => defaultRow(row, table));
    if (/resolution=merge-duplicates/i.test(prefer)) {
      for (const next of changed) {
        const index = rows.findIndex((current) => conflictColumns.every((column) => current[column] === next[column]));
        if (index >= 0) rows[index] = { ...rows[index], ...next, updated_at: new Date().toISOString() };
        else rows.push(next);
      }
    } else {
      if (changed.some((next) => rows.some((current) => current.id === next.id))) {
        return response(409, { code: "23505", message: "Une ligne avec cet identifiant existe déjà dans la base locale." });
      }
      rows.push(...changed);
    }
    writeTable(db, userId, table, rows);
  } else if (method === "PATCH") {
    const patch = body && typeof body === "object" && !Array.isArray(body) ? body : null;
    if (!patch) return response(400, { message: "Les données à modifier sont invalides." });
    const matched = rows.filter((row) => matches(row, url.searchParams));
    const updatedAt = new Date().toISOString();
    rows = rows.map((row) => matched.includes(row) ? { ...row, ...patch, updated_at: updatedAt } : row);
    changed = rows.filter((row) => matches(row, url.searchParams));
    writeTable(db, userId, table, rows);
  } else if (method === "DELETE") {
    changed = rows.filter((row) => matches(row, url.searchParams));
    rows = rows.filter((row) => !matches(row, url.searchParams));
    writeTable(db, userId, table, rows);
  } else {
    return response(405, { message: `Méthode ${method} non prise en charge en local.` });
  }

  const contentRange = `0-${Math.max(0, changed.length - 1)}/${changed.length}`;
  if (headers.get("accept")?.includes("vnd.pgrst.object+json")) {
    if (changed.length !== 1) {
      return response(406, { code: "PGRST116", message: "Le résultat ne contient pas exactement une ligne." }, { "content-range": contentRange });
    }
    return response(200, method === "HEAD" ? undefined : changed[0], { "content-range": contentRange });
  }
  const data = returnsRows ? changed : (method === "GET" ? changed : undefined);
  return response(method === "POST" ? 201 : 200, method === "HEAD" ? undefined : data, { "content-range": contentRange });
}

function createLocalApi() {
  return {
    handle({ pathname, search, method, headers: rawHeaders, body }, db, userId) {
      const url = new URL(`${pathname}${search ?? ""}`, "http://local.invalid");
      const headers = new Headers(rawHeaders ?? {});
      const segments = url.pathname.split("/").filter(Boolean);
      if (segments[0] !== "rest" || segments[1] !== "v1") {
        return response(403, { message: "Seules les opérations de données locales sont autorisées." });
      }
      const payload = body ? JSON.parse(body) : undefined;
      if (segments[2] === "rpc") {
        return handleRpc(segments[3] ?? "", payload ?? {}, db, userId);
      }
      return handleTableRequest(url, method.toUpperCase(), headers, payload, db, userId);
    },
  };
}

module.exports = { createLocalApi, splitSelection, parseSelectionToken };
