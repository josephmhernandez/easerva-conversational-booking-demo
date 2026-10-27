import SimpleStrategyRenderer from "@/app/business/onboarding/calendar-integration-new/components/strategy-renderers/SimpleStrategyRenderer";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockBusinessCalendar = {
  provider: "google",
  connectionStatus: "connected",
  calendarId: "cal-1",
  calendarName: "Business Calendar",
};

const mockCalendarProviders = [
  { id: "google", name: "Google Calendar" },
  { id: "outlook", name: "Outlook/Office 365" },
  { id: "apple", name: "Apple Calendar" },
];

describe("SimpleStrategyRenderer", () => {
  const defaultProps = {
    businessCalendar: mockBusinessCalendar,
    calendarProviders: mockCalendarProviders,
    onBusinessCalendarChange: jest.fn(),
    onConnectionTest: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders business calendar connection section", () => {
    render(<SimpleStrategyRenderer {...defaultProps} />);

    expect(screen.getByText("Business Calendar Connection")).toBeInTheDocument();
    expect(screen.getByText("Calendar Provider")).toBeInTheDocument();
    expect(screen.getByText("Connect Calendar")).toBeInTheDocument();
  });

  it("shows current business calendar provider", () => {
    render(<SimpleStrategyRenderer {...defaultProps} />);

    expect(screen.getByText("Google Calendar")).toBeInTheDocument();
  });

  it("renders provider select with correct options", () => {
    render(<SimpleStrategyRenderer {...defaultProps} />);

    // Check that the select is rendered
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    // Check that the current provider is displayed
    expect(screen.getByText("Google Calendar")).toBeInTheDocument();
  });

  it("calls onConnectionTest when connect button is clicked", async () => {
    const user = userEvent.setup();
    render(<SimpleStrategyRenderer {...defaultProps} />);

    const connectButton = screen.getByText("Connect Calendar");
    await user.click(connectButton);

    expect(defaultProps.onConnectionTest).toHaveBeenCalledWith("business");
  });

  it("disables connect button when no provider is selected", () => {
    const props = {
      ...defaultProps,
      businessCalendar: { ...mockBusinessCalendar, provider: "" },
    };

    render(<SimpleStrategyRenderer {...props} />);

    const connectButton = screen.getByText("Connect Calendar");
    expect(connectButton).toBeDisabled();
  });

  it("shows test button when calendar is connected", () => {
    render(<SimpleStrategyRenderer {...defaultProps} />);

    // The test button is present but doesn't have accessible text, so we check for the icon
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2); // Connect button and test button
  });
});
