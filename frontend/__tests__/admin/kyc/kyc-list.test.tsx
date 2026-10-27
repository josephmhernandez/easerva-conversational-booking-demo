import { render, screen } from "@testing-library/react";
import KycAdminPage from "@/app/admin/kyc/page";
import { ONBOARDING_DRAFT_STATUS } from "@/app/constants/dbConstants";

const mockGetUser = jest.fn();
const mockOrder = jest.fn();
const mockIn = jest.fn();
const mockSelect = jest.fn();
const mockFrom = jest.fn();

jest.mock("@/app/utils/supabase/server", () => ({
  createClient: jest.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

describe("KYC list page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "39dc0e1e-bb1e-4e6f-9bcc-4fcd16b467e4" } },
      error: null,
    });

    mockOrder.mockResolvedValue({ data: [], error: null });
    mockIn.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ in: mockIn });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it("renders heading and section titles", async () => {
    render(await KycAdminPage());

    expect(screen.getByText("KYC Review Queue")).toBeInTheDocument();
    expect(screen.getAllByText("Pending Review").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Approved").length).toBeGreaterThan(0);
    expect(screen.getByText("Rejected / Changes Requested")).toBeInTheDocument();
  });

  it("shows business row details and link", async () => {
    mockOrder.mockResolvedValueOnce({
      data: [
        {
          id: "draft-1",
          business_id: "biz-123",
          status: ONBOARDING_DRAFT_STATUS.SUBMITTED,
          updated_at: "2026-02-27T12:00:00Z",
          businesses: { name: "Acme Spa", category: "Wellness" },
        },
      ],
      error: null,
    });

    render(await KycAdminPage());

    expect(screen.getByText("Acme Spa")).toBeInTheDocument();
    expect(screen.getByText("Wellness")).toBeInTheDocument();
    expect(screen.getByText(/Submitted/)).toBeInTheDocument();
    const rowLink = screen.getByRole("link", { name: /Acme Spa/i });
    expect(rowLink).toHaveAttribute("href", "/admin/kyc/biz-123");
  });

  it("shows empty state text when no apps in a section", async () => {
    render(await KycAdminPage());
    expect(screen.getAllByText("No applications in this category.").length).toBeGreaterThan(0);
  });
});
