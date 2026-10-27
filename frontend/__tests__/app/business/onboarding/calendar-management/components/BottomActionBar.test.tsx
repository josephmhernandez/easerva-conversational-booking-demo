import BottomActionBar from "@/app/business/onboarding/calendar-management/components/BottomActionBar";
import { fireEvent, render, screen } from "@testing-library/react";

describe("BottomActionBar", () => {
  const defaultProps = {
    isSaving: false,
    areAllRequirementsConfigured: false,
    onSave: jest.fn(),
    onContinue: jest.fn(),
    onBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all action buttons", () => {
    render(<BottomActionBar isRoutingPrevious={false} {...defaultProps} />);

    expect(screen.getByText("Save Draft")).toBeInTheDocument();
    expect(screen.getByText("Continue")).toBeInTheDocument();
    expect(screen.getByText("Previous")).toBeInTheDocument();
  });

  it("calls onSave when save button is clicked", () => {
    const mockOnSave = jest.fn();
    render(<BottomActionBar isRoutingPrevious={false} {...defaultProps} onSave={mockOnSave} />);

    fireEvent.click(screen.getByText("Save Draft"));
    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });

  it("calls onContinue when continue button is clicked", () => {
    const mockOnContinue = jest.fn();
    render(
      <BottomActionBar
        isRoutingPrevious={false}
        {...defaultProps}
        onContinue={mockOnContinue}
        areAllRequirementsConfigured={true}
      />
    );

    fireEvent.click(screen.getByText("Continue"));
    expect(mockOnContinue).toHaveBeenCalledTimes(1);
  });

  it("calls onBack when back button is clicked", () => {
    const mockOnBack = jest.fn();
    render(<BottomActionBar isRoutingPrevious={false} {...defaultProps} onBack={mockOnBack} />);

    fireEvent.click(screen.getByText("Previous"));
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it("shows requirements configured state correctly", () => {
    render(
      <BottomActionBar
        isRoutingPrevious={false}
        {...defaultProps}
        areAllRequirementsConfigured={true}
      />
    );

    // Continue button should be enabled when requirements are configured
    const continueButton = screen.getByText("Continue");
    expect(continueButton).toBeInTheDocument();
  });

  it("disables continue button when requirements not configured", () => {
    render(
      <BottomActionBar
        isRoutingPrevious={false}
        {...defaultProps}
        areAllRequirementsConfigured={false}
      />
    );

    const continueButton = screen.getByText("Continue");
    expect(continueButton).toBeInTheDocument();
  });

  it("handles all buttons being clicked in sequence", () => {
    const mockOnSave = jest.fn();
    const mockOnContinue = jest.fn();
    const mockOnBack = jest.fn();

    render(
      <BottomActionBar
        isRoutingPrevious={false}
        {...defaultProps}
        onSave={mockOnSave}
        onContinue={mockOnContinue}
        onBack={mockOnBack}
        areAllRequirementsConfigured={true}
      />
    );

    fireEvent.click(screen.getByText("Save Draft"));
    fireEvent.click(screen.getByText("Continue"));
    fireEvent.click(screen.getByText("Previous"));

    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockOnContinue).toHaveBeenCalledTimes(1);
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it("handles multiple rapid clicks correctly", () => {
    const mockOnSave = jest.fn();
    render(<BottomActionBar isRoutingPrevious={false} {...defaultProps} onSave={mockOnSave} />);

    const saveButton = screen.getByText("Save Draft");

    // Click multiple times rapidly
    fireEvent.click(saveButton);
    fireEvent.click(saveButton);
    fireEvent.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledTimes(3);
  });

  it("renders correctly with all requirements configured", () => {
    render(
      <BottomActionBar
        isRoutingPrevious={false}
        {...defaultProps}
        areAllRequirementsConfigured={true}
      />
    );

    expect(screen.getByText("Save Draft")).toBeInTheDocument();
    expect(screen.getByText("Continue")).toBeInTheDocument();
    expect(screen.getByText("Previous")).toBeInTheDocument();
  });

  it("renders correctly when saving", () => {
    render(<BottomActionBar isRoutingPrevious={false} {...defaultProps} isSaving={true} />);

    expect(screen.getByText("Previous")).toBeInTheDocument();
  });

  it("handles edge case with all props true", () => {
    render(
      <BottomActionBar
        isRoutingPrevious={false}
        {...defaultProps}
        isSaving={true}
        areAllRequirementsConfigured={true}
      />
    );

    expect(screen.getByText("Previous")).toBeInTheDocument();
  });

  it("handles edge case with all props false", () => {
    render(
      <BottomActionBar
        isRoutingPrevious={false}
        {...defaultProps}
        isSaving={false}
        areAllRequirementsConfigured={false}
      />
    );

    expect(screen.getByText("Save Draft")).toBeInTheDocument();
    expect(screen.getByText("Continue")).toBeInTheDocument();
    expect(screen.getByText("Previous")).toBeInTheDocument();
  });
});
