import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import KycDetailClient from "@/app/admin/kyc/[businessId]/KycDetailClient";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const baseApp = {
  business_id: "biz-123",
  status: "submitted",
  businessInfo: {
    name: "Acme Spa",
    category: "Wellness",
    description: "Premium spa services",
    phone: "123",
    email: "a@b.com",
    website: "https://acme.com",
    slug: "acme-spa",
  },
  locations: [],
  services: [],
  calendarManagement: { summary: { totalEmployeeCalendars: 0, unconfiguredCount: 0 } },
};

describe("KYC detail page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === "/api/business/onboarding/review") {
        return Promise.resolve({ ok: true, json: async () => ({ applications: [baseApp] }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
    });
    window.confirm = jest.fn(() => true);
  });

  it("renders core details and action buttons", async () => {
    render(<KycDetailClient businessId="biz-123" hasLocationData={true} />);

    expect(await screen.findByRole("heading", { name: /Acme Spa/i })).toBeInTheDocument();
    expect(screen.getByText("Wellness")).toBeInTheDocument();
    expect(screen.getByText("Premium spa services")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Approve/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reject/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Trigger Static Build/i })).not.toBeInTheDocument();
  });

  it("approve calls API and shows success", async () => {
    render(<KycDetailClient businessId="biz-123" hasLocationData={true} />);
    await screen.findByRole("heading", { name: /Acme Spa/i });

    await userEvent.click(screen.getByRole("button", { name: /Approve/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/kyc/biz-123/approve",
        expect.objectContaining({ method: "POST" })
      );
    });
    expect(await screen.findByText(/Business approved!/i)).toBeInTheDocument();
  });

  it("reject without notes shows validation error", async () => {
    render(<KycDetailClient businessId="biz-123" hasLocationData={true} />);
    await screen.findByRole("heading", { name: /Acme Spa/i });

    await userEvent.click(screen.getByRole("button", { name: /^Reject$/i }));

    expect(await screen.findByText(/Notes are required when rejecting/i)).toBeInTheDocument();
  });

  it("reject with notes posts and shows rejected state", async () => {
    render(<KycDetailClient businessId="biz-123" hasLocationData={true} />);
    await screen.findByRole("heading", { name: /Acme Spa/i });

    await userEvent.type(screen.getByPlaceholderText(/Enter notes/i), "Missing licensing doc");
    await userEvent.click(screen.getByRole("button", { name: /^Reject$/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/kyc/biz-123/approve",
        expect.objectContaining({ method: "POST" })
      );
    });
    expect(await screen.findByText("Business rejected.")).toBeInTheDocument();
  });

  it("shows missing location warning when hasLocationData is false", async () => {
    render(<KycDetailClient businessId="biz-123" hasLocationData={false} />);
    expect(await screen.findByText(/This business has no location data/i)).toBeInTheDocument();
  });

  it("does not show missing location warning when hasLocationData is true", async () => {
    render(<KycDetailClient businessId="biz-123" hasLocationData={true} />);
    await screen.findByRole("heading", { name: /Acme Spa/i });
    expect(screen.queryByText(/This business has no location data/i)).not.toBeInTheDocument();
  });
});
