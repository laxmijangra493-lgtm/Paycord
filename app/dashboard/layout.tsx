import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/supabase-server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell email={user.email ?? "creator"}>{children}</AppShell>;
}
