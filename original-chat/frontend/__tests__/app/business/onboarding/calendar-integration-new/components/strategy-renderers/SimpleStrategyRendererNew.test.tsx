import SimpleStrategyRendererNew from "@/app/business/onboarding/calendar-integration-new/components/strategy-renderers/SimpleStrategyRendererNew";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

describe("SimpleStrategyRendererNew", () => {
  const mockBusinessCalendar = {
    provider: "google",
    connectionStatus: "connected",
    calendarId: "cal123",
    calendarName: "My Business Calendar",
  };

  const mockCalendarProviders = [
    { id: "google", name: "Google Calendar" },
    { id: "outlook", name: "Outlook/Office 365" },
    { id: "apple", name: "Apple Calendar" },
  ];

  const defaultProps = {
    businessCalendar: mockBusinessCalendar,
    calendarProviders: mockCalendarProviders,
    onBusinessCalendarChange: jest.fn(),
    onConnectionTest: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<SimpleStrategyRendererNew {...defaultProps} />);
    expect(screen.getByText("Business Calendar")).toBeInTheDocument();
  });

  it("displays calendar provider selection", () => {
    render(<SimpleStrategyRendererNew {...defaultProps} />);

    // Check that the select element exists and has the correct value
    const providerSelect = screen.getByRole("combobox");
    expect(providerSelect).toBeInTheDocument();
    expect(providerSelect).toHaveValue("google");

    // Check that all providers are available as options
    mockCalendarProviders.forEach((provider) => {
      expect(screen.getByText(provider.name)).toBeInTheDocument();
    });
  });

  it("displays connection status", () => {
    render(<SimpleStrategyRendererNew {...defaultProps} />);

    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("displays disconnected status correctly", () => {
    const disconnectedCalendar = {
      ...mockBusinessCalendar,
      connectionStatus: "disconnected",
    };

    render(<SimpleStrategyRendererNew {...defaultProps} businessCalendar={disconnectedCalendar} />);

    expect(screen.getByText("Disconnected")).toBeInTheDocument();
  });

  it("displays calendar name input when calendar ID exists", () => {
    render(<SimpleStrategyRendererNew {...defaultProps} />);

    const calendarNameInput = screen.getByDisplayValue("My Business Calendar");
    expect(calendarNameInput).toBeInTheDocument();
  });

  it("does not display calendar name input when calendar ID is empty", () => {
    const calendarWithoutId = {
      ...mockBusinessCalendar,
      calendarId: "",
    };

    render(<SimpleStrategyRendererNew {...defaultProps} businessCalendar={calendarWithoutId} />);

    expect(screen.queryByDisplayValue("My Business Calendar")).not.toBeInTheDocument();
  });

  it("calls onBusinessCalendarChange when provider is changed", () => {
    render(<SimpleStrategyRendererNew {...defaultProps} />);

    const providerSelect = screen.getByRole("combobox");
    fireEvent.change(providerSelect, { target: { value: "outlook" } });

    expect(defaultProps.onBusinessCalendarChange).toHaveBeenCalledWith({
      ...mockBusinessCalendar,
      provider: "outlook",
    });
  });

  it("calls onBusinessCalendarChange when calendar name is changed", () => {
    render(<SimpleStrategyRendererNew {...defaultProps} />);

    const calendarNameInput = screen.getByDisplayValue("My Business Calendar");
    fireEvent.change(calendarNameInput, { target: { value: "New Calendar Name" } });

    expect(defaultProps.onBusinessCalendarChange).toHaveBeenCalledWith({
      ...mockBusinessCalendar,
      calendarName: "New Calendar Name",
    });
  });

  it("calls onConnectionTest when test connection button is clicked", () => {
    render(<SimpleStrategyRendererNew {...defaultProps} />);

    const testButton = screen.getByText("Test Connection");
    fireEvent.click(testButton);

    expect(defaultProps.onConnectionTest).toHaveBeenCalledWith("business");
  });

  it("applies correct styling to connection status", () => {
    render(<SimpleStrategyRendererNew {...defaultProps} />);

    const connectedStatus = screen.getByText("Connected");
    expect(connectedStatus).toHaveClass("bg-green-100", "text-green-800");
  });

  it("applies correct styling to disconnected status", () => {
    const disconnectedCalendar = {
      ...mockBusinessCalendar,
      connectionStatus: "disconnected",
    };

    render(<SimpleStrategyRendererNew {...defaultProps} businessCalendar={disconnectedCalendar} />);

    const disconnectedStatus = screen.getByText("Disconnected");
    expect(disconnectedStatus).toHaveClass("bg-red-100", "text-red-800");
  });

  it("handles empty calendar providers gracefully", () => {
    const propsWithEmptyProviders = {
      ...defaultProps,
      calendarProviders: [],
    };

    render(<SimpleStrategyRendererNew {...propsWithEmptyProviders} />);

    expect(screen.getByText("Select a provider")).toBeInTheDocument();
  });

  it("handles undefined business calendar gracefully", () => {
    const propsWithUndefinedCalendar = {
      ...defaultProps,
      businessCalendar: {
        provider: "",
        connectionStatus: "disconnected",
        calendarId: "",
        calendarName: "",
      },
    };

    render(<SimpleStrategyRendererNew {...propsWithUndefinedCalendar} />);

    expect(screen.getByText("Disconnected")).toBeInTheDocument();
    expect(screen.getByText("Select a provider")).toBeInTheDocument();
  });
});
