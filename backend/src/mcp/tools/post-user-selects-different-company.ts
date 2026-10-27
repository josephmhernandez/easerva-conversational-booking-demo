import { Company } from "../machines/types";

export async function postUserSelectsDifferentCompany(
  actor: any,
  companyId: string,
  notes: string
): Promise<Company> {
  // If we have a companyId, we will select the company.
  // If we don't have a companyId, we will replay the companies available to the user.
  const companies = await getCompanies(actor);
  if (companyId) {
    const selectedCompany = companies.find((company: Company) => company.id === companyId);
    if (!selectedCompany) {
      console.error(`Company with id ${companyId} not found`);
      throw new Error(
        `Company with id ${companyId} not found. Have available companies: ${JSON.stringify(companies)}`
      );
    }

    actor.send({
      type: "SELECT_DIFFERENT_COMPANY",
      output: { company: selectedCompany as Company },
    });
  } else {
    // We will replay the companies available to the user.
    const mockNewCompany = {
      id: "m1",
      name: "Mock New Company",
      description: "Mock New Company Description",
      questions: [],
    } as Company;
    const mockNewCompanies = [mockNewCompany];

    // Add the new company to list of companies.
    const newCompanies = [...mockNewCompanies, ...companies];
    actor.send({
      type: "REQUEST_DIFFERENT_COMPANY",
      output: { companies: newCompanies as Company[] },
    });
  }
  return { id: companyId } as Company;
}

// get companies from the state machine
const getCompanies = async (actor: any) => {
  const snapshot = actor.getSnapshot();
  const context = snapshot.context;
  const companies = context.companies;
  return companies;
};
