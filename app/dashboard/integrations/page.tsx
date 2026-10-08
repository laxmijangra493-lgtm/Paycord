import { getIntegrationsForCurrentUser } from "@/lib/data";
import { IntegrationsClient } from "@/components/integrations-client";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const integrations = await getIntegrationsForCurrentUser();
  return <IntegrationsClient integrations={integrations} />;
}
