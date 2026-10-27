import { Company } from "../machines/types";

export async function getCurrentCompanies(actor: any) {
  console.log("[MCP Tools] Getting current companies");

  const snapshot = await actor.getSnapshot();
  const companies: Company[] = snapshot.context.companies;

  return companies;
}
