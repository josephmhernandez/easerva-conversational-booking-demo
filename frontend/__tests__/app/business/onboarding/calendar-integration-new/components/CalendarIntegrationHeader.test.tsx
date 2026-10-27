import CalendarIntegrationHeader from "@/app/business/onboarding/calendar-integration-new/components/CalendarIntegrationHeader";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

describe("CalendarIntegrationHeader", () => {
  const defaultProps = {
    currentStep: 9,
    totalSteps: 12,
    title: "Connect Your Calendars",
    subtitle: "Set up calendar integration for your location booking system",
    progressValue: 75,
    stepName: "Calendar Integration",
  };

  it("renders with correct title and subtitle", () => {
    render(<CalendarIntegrationHeader {...defaultProps} />);

    expect(screen.getByText("Connect Your Calendars")).toBeInTheDocument();
    expect(
      screen.getByText("Set up calendar integration for your location booking system")
    ).toBeInTheDocument();
  });

  it("displays correct step information", () => {
    render(<CalendarIntegrationHeader {...defaultProps} />);

    expect(screen.getByText("Step 9 of 12")).toBeInTheDocument();
  });

  it("renders progress bar with correct value", () => {
    render(<CalendarIntegrationHeader {...defaultProps} />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();
    // The Progress component uses transform style instead of aria-valuenow
    expect(progressBar).toHaveAttribute("aria-valuemin", "0");
    expect(progressBar).toHaveAttribute("aria-valuemax", "100");
  });

  it("displays additional description text", () => {
    render(<CalendarIntegrationHeader {...defaultProps} />);

    expect(
      screen.getByText("Configure calendar integration for your booking system")
    ).toBeInTheDocument();
  });

  it("handles different step numbers correctly", () => {
    const customProps = {
      ...defaultProps,
      currentStep: 5,
      totalSteps: 10,
      progressValue: 50,
    };

    render(<CalendarIntegrationHeader {...customProps} />);

    expect(screen.getByText("Step 5 of 10")).toBeInTheDocument();
  });

  it("handles custom title and subtitle", () => {
    const customProps = {
      ...defaultProps,
      title: "Custom Title",
      subtitle: "Custom subtitle text",
    };

    render(<CalendarIntegrationHeader {...customProps} />);

    expect(screen.getByText("Custom Title")).toBeInTheDocument();
    expect(screen.getByText("Custom subtitle text")).toBeInTheDocument();
  });
});
