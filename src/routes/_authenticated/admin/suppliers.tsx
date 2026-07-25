import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/suppliers")({
  beforeLoad: () => { throw redirect({ to: "/admin/purchases" }); },
  component: () => null,
});
