import { render, screen } from "@testing-library/react";
import AdminBusinessesPage from "../page";

const mockGetUser = jest.fn();
const mockEq = jest.fn();
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));

jest.mock("@/app/constants/dbConstants", () => ({
  ADMIN_USER_IDS: ["admin-1"],
}));

jest.mock("@/app/utils/supabase/server", () => ({
  createClient: jest.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

describe("Admin businesses page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
  });

  it("renders list of businesses with names", async () => {
    mockEq.mockResolvedValueOnce({
      data: [
        {
          id: "1",
          name: "Alpha Law",
          slug: "alpha",
          city_slug: "miami",
          category_slug: "law",
          static_published: true,
          last_built_at: "2026-03-01",
        },
      ],
    });

    render(await AdminBusinessesPage());

    expect(screen.getByText("Alpha Law")).toBeInTheDocument();
  });

  it("shows published status when static_published=true", async () => {
    mockEq.mockResolvedValueOnce({
      data: [
        {
          id: "1",
          name: "Alpha",
          slug: "alpha",
          city_slug: "miami",
          category_slug: "law",
          static_published: true,
          last_built_at: null,
        },
      ],
    });

    render(await AdminBusinessesPage());
    expect(screen.getByText("🟢 Published")).toBeInTheDocument();
  });

  it("shows pending for approved but never built", async () => {
    mockEq.mockResolvedValueOnce({
      data: [
        {
          id: "2",
          name: "Beta",
          slug: "beta",
          city_slug: "austin",
          category_slug: "real-estate",
          static_published: false,
          last_built_at: null,
        },
      ],
    });

    render(await AdminBusinessesPage());
    expect(screen.getByText("🟡 Pending")).toBeInTheDocument();
  });

  it("shows never built indicator for static_published=false with last_built_at", async () => {
    mockEq.mockResolvedValueOnce({
      data: [
        {
          id: "3",
          name: "Gamma",
          slug: "gamma",
          city_slug: "nyc",
          category_slug: "cars",
          static_published: false,
          last_built_at: "2026-02-01",
        },
      ],
    });

    render(await AdminBusinessesPage());
    expect(screen.getByText("🔴 Not built")).toBeInTheDocument();
  });

  it("View Page link has correct href", async () => {
    mockEq.mockResolvedValueOnce({
      data: [
        {
          id: "1",
          name: "Alpha",
          slug: "alpha",
          city_slug: "miami",
          category_slug: "law",
          static_published: true,
          last_built_at: null,
        },
      ],
    });

    render(await AdminBusinessesPage());

    expect(screen.getByRole("link", { name: "View Page" })).toHaveAttribute(
      "href",
      "https://easerva.com/providers/miami/law/alpha/"
    );
  });

  it("shows empty state when no businesses", async () => {
    mockEq.mockResolvedValueOnce({ data: [] });

    render(await AdminBusinessesPage());

    expect(screen.queryByText("View Page")).not.toBeInTheDocument();
    expect(screen.getByText("Businesses")).toBeInTheDocument();
  });
});
