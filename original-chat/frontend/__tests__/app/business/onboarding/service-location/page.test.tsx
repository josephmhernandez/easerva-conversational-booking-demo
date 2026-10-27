import ServiceLocationPage from "@/app/business/onboarding/service-location/page";
import { fireEvent, render, screen, within } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

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

function createFetchMockSequence(responses: Array<{ ok?: boolean; json?: any }>) {
  const queue = [...responses];
  return jest.fn().mockImplementation(() => {
    const next = queue.shift() || { ok: true, json: async () => ({}) };
    return Promise.resolve({
      ok: next.ok !== undefined ? next.ok : true,
      json: async () => next.json,
    });
  });
}

const servicesDraft = {
  draftData: {
    services: [
      {
        id: "1759926523173",
        name: "hair cut",
        price: 75,
        category: "Beauty",
        duration: 60,
        priceType: "fixed",
        deliveryOptions: { mobile: false, virtual: false, inPerson: true },
      },
      {
        id: "1759926602690",
        name: "coloring",
        price: 0,
        category: "Beauty",
        duration: 180,
        priceMax: 400,
        priceMin: 150,
        priceType: "variable",
        deliveryOptions: { mobile: true, virtual: false, inPerson: true },
      },
      {
        id: "1759926604705",
        name: "haircut and shave",
        price: 100,
        category: "Beauty",
        duration: 60,
        priceType: "fixed",
        deliveryOptions: { mobile: true, virtual: false, inPerson: false },
      },
      {
        id: "1760099450592",
        name: "hair consultation",
        price: 35,
        category: "Beauty",
        duration: 30,
        priceType: "fixed",
        deliveryOptions: { mobile: false, virtual: true, inPerson: false },
      },
    ],
  },
};

const locationsDraft = {
  draftData: {
    "serviceTypes.mobile": {
      mobileServices: [
        {
          id: "mobile-1d399e38-ec24-446b-b4e6-4d2ebc7a4956",
          name: "Mobile Service 1",
          serviceArea: { type: "radius_zip_code", radius: 25, zipCenter: "76034" },
        },
      ],
    },
    "serviceTypes.virtual": {
      virtualServices: [
        {
          id: "online-ac5d4906-e47b-4b42-b368-f4f47d89b0fd",
          name: "Virtual Service 1",
          platform: "zoom",
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
          state: "TX",
          zipCode: "76034-3678",
        },
        {
          id: "location-1758376721088",
          city: "Dallas",
          name: "Sub Plano location",
          line1: "8610 Southwestern blvd. ",
          line2: "",
          state: "TX",
          zipCode: "75206",
        },
      ],
    },
  },
};

const resourcesDraft = {
  draftData: {
    main: {
      name: "Main Location",
      type: "physical",
      resources: [{ id: "1760099383712", name: "room A", type: "room", locationId: "main" }],
    },
    "location-1758376721088": {
      name: "Sub Plano location",
      type: "physical",
      resources: [
        {
          id: "1760099372397",
          name: "room 1",
          type: "room",
          locationId: "location-1758376721088",
        },
      ],
    },
    "mobile-1d399e38-ec24-446b-b4e6-4d2ebc7a4956": {
      name: "Mobile Service 1",
      type: "mobile",
      resources: [
        {
          id: "1760099360332",
          name: "Service Van 1",
          type: "vehicle",
          locationId: "mobile-1d399e38-ec24-446b-b4e6-4d2ebc7a4956",
        },
      ],
    },
  },
};

const currentStepDraft = { draftData: {} };

async function renderPageWithDrafts({
  services = servicesDraft,
  locations = locationsDraft,
  resources = resourcesDraft,
  current = currentStepDraft,
}: Partial<Record<string, any>> = {}) {
  global.fetch = createFetchMockSequence([
    { ok: true, json: services },
    { ok: true, json: locations },
    { ok: true, json: resources },
    { ok: true, json: current },
  ]) as any;

  render(<ServiceLocationPage />);
  await screen.findByTestId("ready-state");
}

describe("ServiceLocationPage", () => {
  it("renders location columns with ids/names from new schema", async () => {
    await renderPageWithDrafts();
    const matrix = await screen.findByTestId("matrix-card");
    const header = within(matrix).getByTestId("matrix-header");
    expect(header).toBeInTheDocument();

    expect(screen.getByTestId("location-name-main")).toHaveTextContent("Main Location");
    expect(screen.getByTestId("location-name-location-1758376721088")).toHaveTextContent(
      "Sub Plano location"
    );
    expect(
      screen.getByTestId("location-name-mobile-1d399e38-ec24-446b-b4e6-4d2ebc7a4956")
    ).toHaveTextContent("Mobile Service 1");
    expect(
      screen.getByTestId("location-name-online-ac5d4906-e47b-4b42-b368-f4f47d89b0fd")
    ).toHaveTextContent("Virtual Service 1");
  });

  it("formats mobile service area and virtual platform address", async () => {
    await renderPageWithDrafts();
    const mobileHeader = screen.getByTestId(
      "location-col-mobile-1d399e38-ec24-446b-b4e6-4d2ebc7a4956"
    );
    expect(mobileHeader).toHaveAttribute("data-address", "25 mile radius from 76034");

    const virtualHeader = screen.getByTestId(
      "location-col-online-ac5d4906-e47b-4b42-b368-f4f47d89b0fd"
    );
    expect(virtualHeader).toHaveAttribute("data-address", "zoom Platform");
  });

  it("continue is disabled until a configuration is enabled then navigates", async () => {
    const push = jest.fn();
    (jest.requireMock("next/navigation") as any).useRouter = () => ({ push });

    await renderPageWithDrafts();
    const continueBtn = screen.getByTestId("continue-btn");
    expect(continueBtn).toBeDisabled();

    // Enable one config: pick service that supports virtual at a virtual location
    const serviceId = "1760099450592"; // virtual true
    const virtualLocationId = "online-ac5d4906-e47b-4b42-b368-f4f47d89b0fd";
    fireEvent.click(screen.getByTestId(`configure-btn-${serviceId}-${virtualLocationId}`));

    const modal = await screen.findByTestId("config-modal");
    fireEvent.click(within(modal).getByTestId("enable-switch"));
    fireEvent.click(within(modal).getByTestId("save-config-btn"));

    // After enabling one config, continue should be enabled
    expect(continueBtn).not.toBeDisabled();
  });
  it("shows resources in Configure modal for a mobile location when enabled", async () => {
    await renderPageWithDrafts();
    const serviceId = "1759926604705"; // mobile true
    const locationId = "mobile-1d399e38-ec24-446b-b4e6-4d2ebc7a4956";
    const btn = await screen.findByTestId(`configure-btn-${serviceId}-${locationId}`);
    fireEvent.click(btn);

    const modal = await screen.findByTestId("config-modal");
    const enable = within(modal).getByTestId("enable-switch");
    // Shadcn Switch uses checked state; simulate toggle via click
    fireEvent.click(enable);

    const resourcesSection = await within(modal).findByTestId("resources-section");
    expect(resourcesSection).toHaveTextContent("Service Van 1");
  });

  it("posts save draft payload on Save Draft", async () => {
    const postSpy = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => servicesDraft })
      .mockResolvedValueOnce({ ok: true, json: async () => locationsDraft })
      .mockResolvedValueOnce({ ok: true, json: async () => resourcesDraft })
      .mockResolvedValueOnce({ ok: true, json: async () => currentStepDraft })
      .mockImplementationOnce(postSpy);

    render(<ServiceLocationPage />);
    await screen.findByTestId("ready-state");

    fireEvent.click(screen.getByTestId("save-draft-btn"));
    expect(global.fetch).toHaveBeenLastCalledWith(
      "/api/business/onboarding/draft",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("handles empty services data when service templates returns 200 with no data", async () => {
    await renderPageWithDrafts({ services: { draftData: {} } });
    // Matrix should still render with locations but 0 service rows
    const matrix = await screen.findByTestId("matrix-card");
    const rows = within(matrix).queryAllByTestId(/service-row-/);
    expect(rows.length).toBe(0);
  });
});
