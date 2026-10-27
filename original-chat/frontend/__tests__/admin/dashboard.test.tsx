import { render, screen } from "@testing-library/react";
import AdminPage from "@/app/admin/page";

const mockGetUser = jest.fn();
const mockRedirect = jest.fn();

jest.mock("@/app/utils/supabase/server", () => ({
  createClient: jest.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

jest.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

jest.mock("@/app/admin/AdminReviewClient", () => () => <div>Admin Review Client</div>);

describe("Admin dashboard page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "39dc0e1e-bb1e-4e6f-9bcc-4fcd16b467e4" } },
      error: null,
    });
  });

  it("renders KYC Review nav link and content", async () => {
    render(await AdminPage());

    expect(screen.getByRole("link", { name: /KYC Review/i })).toHaveAttribute("href", "/admin/kyc");
    expect(screen.getByRole("link", { name: /Applications Review/i })).toBeInTheDocument();
    expect(screen.getByText("Admin Review Client")).toBeInTheDocument();
  });

  it("redirects non-admin user", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "non-admin" } }, error: null });

    await AdminPage();
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });
});
