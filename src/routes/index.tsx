import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin" });
  },
  head: () => ({
    meta: [
      { title: "Gestion de stock et vente directe" },
      { name: "description", content: "Application configurable de gestion de stock, ventes et documents pour votre boutique." },
      { property: "og:title", content: "Gestion de stock et vente directe" },
      { property: "og:description", content: "Gérez votre stock, vos ventes directes et vos documents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
