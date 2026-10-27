import { Company } from "../machines/types";

export type PostUserSelectsCompanyOutput = {
  success: boolean;
  company: Company | null;
  error?: string;
};

export async function postUserSelectsCompany(
  actor: any,
  companyId: string
): Promise<PostUserSelectsCompanyOutput> {
  console.log("[MCP] User selects company:", companyId);

  const currentCompanies = actor.getSnapshot().context.companies;

  const company: Company = currentCompanies.find((company: Company) => company.id === companyId);

  if (!company) {
    return {
      success: false,
      company: null,
      error: "Company not found for id: " + companyId + " in " + JSON.stringify(currentCompanies),
    } as PostUserSelectsCompanyOutput;
  }

  actor.send({
    type: "COMPANY_SELECTED",
    output: {
      company: company,
    },
  });

  return {
    success: true,
    company: company,
  } as PostUserSelectsCompanyOutput;
}
