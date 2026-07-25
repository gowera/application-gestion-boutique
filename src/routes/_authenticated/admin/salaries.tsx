import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/salaries")({
  beforeLoad: () => { throw redirect({ to: "/admin/employees" }); },
  component: () => null,
});
