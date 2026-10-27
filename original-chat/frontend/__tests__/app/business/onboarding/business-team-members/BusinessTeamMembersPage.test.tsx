import BusinessTeamMembersPage from "@/app/business/onboarding/business-team-members/page";
import { OnboardingStep } from "@/app/constants/businessConstants";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock Supabase client
const mockUnsubscribe = jest.fn();
const mockSupabaseClient = {
  auth: {
    getSession: jest.fn(() =>
      Promise.resolve({
        data: {
          session: null,
        },
      })
    ),
    onAuthStateChange: jest.fn(() => ({
      data: {
        subscription: {
          unsubscribe: mockUnsubscribe,
        },
      },
    })),
    signOut: jest.fn(),
    signInWithOAuth: jest.fn(),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
  },
};

jest.mock("@/app/utils/supabase/client", () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

// Reuse global mocks from jest.setup.ts (router, fetch, etc.)

// Shared mock data
const mockBusinessLocationResponse = {
  ok: true,
  json: () =>
    Promise.resolve({
      step: "business_location",
      draftData: {
        "serviceTypes.mobile": {
          mobileServices: [
            {
              id: "mobile-1d399e38-ec24-446b-b4e6-4d2ebc7a4956",
              name: "Mobile Service 1",
              serviceArea: { type: "radius_zip_code", zipCenter: "76034", radius: 25 },
            },
          ],
        },
        "serviceTypes.physical": {
          addresses: [
            {
              id: "main",
              city: "Colleyville",
              name: "Main Location",
              line1: "4510 Mill Pond Ct",
              line2: "",
              phone: "",
              state: "TX",
              country: "US",
              zipCode: "76034-3678",
              timezone: "",
              isValidated: true,
            },
            {
              id: "location-1758376721088",
              city: "Dallas",
              name: "Sub Plano location",
              line1: "8610 Southwestern blvd. ",
              line2: "",
              phone: "",
              state: "TX",
              country: "US",
              zipCode: "75206",
              timezone: "",
              isValidated: true,
            },
          ],
        },
        "serviceTypes.virtual": {
          virtualServices: [
            {
              id: "online-ac5d4906-e47b-4b42-b368-f4f47d89b0fd",
              name: "Virtual Service 1",
              platform: "zoom",
              defaultLink: "",
              instructions: "",
              timezone: "America/Chicago",
            },
          ],
        },
      },
    }),
};

const mockTeamMembersResponse = {
  ok: true,
  json: () =>
    Promise.resolve({
      step: "business_team_members",
      draftData: {
        teamOption: "team",
        main: {
          name: "Main Location",
          type: "physical",
          teamMembers: [
            {
              id: "emp-1",
              fullName: "Alice Brown",
              email: "alice@example.com",
              role: "Stylist",
              takesBookings: true,
              locationId: "main",
            },
          ],
        },
        "mobile-1d399e38-ec24-446b-b4e6-4d2ebc7a4956": {
          name: "Mobile Service 1",
          type: "mobile",
          teamMembers: [
            {
              id: "emp-2",
              fullName: "Bob Smith",
              email: "bob@example.com",
              role: "Therapist",
              takesBookings: true,
              locationId: "mobile-1d399e38-ec24-446b-b4e6-4d2ebc7a4956",
            },
          ],
        },
      },
    }),
};

describe("BusinessTeamMembersPage", () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (options?.method === "POST") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
      }

      if (url.includes(OnboardingStep.BUSINESS_LOCATION)) {
        return Promise.resolve(mockBusinessLocationResponse);
      }
      if (url.includes("business_team_members")) {
        return Promise.resolve(mockTeamMembersResponse);
      }
      return Promise.resolve({ ok: false });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("loads locations from business_location and generates tabs for physical, mobile, and virtual", async () => {
    const user = userEvent.setup();
    render(<BusinessTeamMembersPage />);

    // Wait for team option to be available using findBy
    const teamOption = await screen.findByTestId("option-team");
    await user.click(teamOption);

    // Wait for the first location tab to appear (proves tabs are rendered)
    await screen.findByTestId("location-tab-main");

    // Now verify all expected tabs are present
    expect(screen.getByTestId("locations-tabs")).toBeInTheDocument();
    expect(screen.getByTestId("location-tab-location-1758376721088")).toBeInTheDocument();
    expect(
      screen.getByTestId("location-tab-mobile-1d399e38-ec24-446b-b4e6-4d2ebc7a4956")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("location-tab-online-ac5d4906-e47b-4b42-b368-f4f47d89b0fd")
    ).toBeInTheDocument();
  });

  it("merges existing team members into corresponding locations", async () => {
    const user = userEvent.setup();
    render(<BusinessTeamMembersPage />);

    // Wait for team option to be available
    const teamOption = await screen.findByTestId("option-team");

    // Switch to team option
    await user.click(teamOption);

    // Wait for tabs and select Main Location tab
    const mainTab = await screen.findByTestId("location-tab-main");
    await user.click(mainTab);

    // Alice should be listed under Main Location using findBy
    expect((await screen.findAllByText("Alice Brown")).length).toBeGreaterThan(0);
  });

  it("adds an individual member to the active location", async () => {
    const user = userEvent.setup();
    render(<BusinessTeamMembersPage />);

    // Wait for team option to be available (replaces waitFor + queryBy)
    const teamOption = await screen.findByTestId("option-team");
    await user.click(teamOption);

    // Wait for tabs to appear and choose Mobile service tab
    const mobileTab = await screen.findByTestId(
      "location-tab-mobile-1d399e38-ec24-446b-b4e6-4d2ebc7a4956"
    );
    await user.click(mobileTab);

    // Open individual add form and wait for it
    const addButton = screen.getByTestId("add-member-button");
    await user.click(addButton);

    const fullNameInput = await screen.findByTestId("input-fullName");
    const emailInput = screen.getByTestId("input-email");
    const roleInput = screen.getByTestId("input-role");

    // Fill fields
    await user.type(fullNameInput, "Charlie Johnson");
    await user.type(emailInput, "charlie@example.com");
    await user.type(roleInput, "Assistant");

    // Enable takes bookings
    await user.click(screen.getByTestId("checkbox-takesBookings"));

    // Add member
    await user.click(screen.getByTestId("add-team-member"));

    // Verify appears in list for Mobile Service 1 using findBy
    expect(await screen.findByText("Charlie Johnson")).toBeInTheDocument();
    expect(await screen.findByText("charlie@example.com")).toBeInTheDocument();
    expect(await screen.findByText("Assistant")).toBeInTheDocument();
  }, 10000);

  it("imports members from CSV into the active location", async () => {
    const user = userEvent.setup();
    render(<BusinessTeamMembersPage />);

    // Wait for team option to be available
    const teamOption = await screen.findByTestId("option-team");
    await user.click(teamOption);

    // Wait for tabs and choose Virtual service tab
    const virtualTab = await screen.findByTestId(
      "location-tab-online-ac5d4906-e47b-4b42-b368-f4f47d89b0fd"
    );
    await user.click(virtualTab);

    // Open CSV import and wait for textarea
    const csvButton = screen.getByTestId("csv-import-button");
    await user.click(csvButton);

    const textarea = (await screen.findByTestId("csv-textarea")) as HTMLTextAreaElement;

    // Use type instead of paste for better compatibility
    await user.type(
      textarea,
      "John Doe, john@example.com, Stylist, yes{Enter}Jane Smith, jane@example.com, Assistant, no"
    );

    await user.click(screen.getByTestId("csv-import-confirm"));

    // Verify members appear using findBy
    expect(await screen.findByText("John Doe")).toBeInTheDocument();
    expect(await screen.findByText("jane@example.com")).toBeInTheDocument();
  }, 10000);

  it("validates continue button state for solo vs team", async () => {
    const user = userEvent.setup();
    render(<BusinessTeamMembersPage />);

    // Wait for continue button using findBy
    const continueButton = await screen.findByTestId("continue-button");

    // Solo provider should allow continue
    expect(continueButton).toBeEnabled();

    // Switch to team with no additional members removed
    await user.click(screen.getByTestId("option-team"));

    // There are preloaded members from the mock for some locations, so continue may still be enabled
    // Ensure not disabled due to validation blocking
    expect(continueButton).toBeEnabled();
  });

  it("saves data with teamOption and per-location members when continuing", async () => {
    const user = userEvent.setup();
    render(<BusinessTeamMembersPage />);

    // Wait for team option and continue button
    const teamOption = await screen.findByTestId("option-team");
    const continueButton = await screen.findByTestId("continue-button");

    // Ensure we're in team mode to include members in payload
    await user.click(teamOption);
    await user.click(teamOption);

    // Click Continue triggers save (POST)
    await user.click(continueButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/business/onboarding/draft",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    // Verify payload structure
    const lastCall = (global.fetch as jest.Mock).mock.calls.find(
      (c) => c[0] === "/api/business/onboarding/draft"
    );
    const body = JSON.parse(lastCall?.[1]?.body ?? "{}");

    expect(body.step).toBe("business_team_members");
    expect(body.stepData.teamOption).toBeDefined();
    // Should include keys for locations that have members
    expect(body.stepData.main).toBeDefined();
    expect(body.stepData["mobile-1d399e38-ec24-446b-b4e6-4d2ebc7a4956"]).toBeDefined();
  });

  it("removes a member from a location list", async () => {
    const user = userEvent.setup();
    render(<BusinessTeamMembersPage />);

    // Wait for team option
    const teamOption = await screen.findByTestId("option-team");

    // Team mode
    await user.click(teamOption);

    // Wait for tabs and go to Main Location where Alice is
    const mainTab = await screen.findByTestId("location-tab-main");
    await user.click(mainTab);

    // Wait for Alice to appear, then click remove button
    await screen.findByText("Alice Brown");
    await user.click(screen.getByTestId("remove-member-emp-1"));

    // Verify Alice is removed using waitFor since removal is async
    await waitFor(() => {
      expect(screen.queryByText("Alice Brown")).not.toBeInTheDocument();
    });
  });
});
