import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/caisse")({
  beforeLoad: () => { throw redirect({ to: "/admin/reports" }); },
  component: () => null,
});
