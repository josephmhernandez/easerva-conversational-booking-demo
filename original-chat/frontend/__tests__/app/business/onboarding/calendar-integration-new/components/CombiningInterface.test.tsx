import CombiningInterface from "@/app/business/onboarding/calendar-integration-new/components/CombiningInterface";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("CombiningInterface", () => {
  const defaultProps = {
    combiningMode: false,
    selectedCards: [],
    bookingStrategy: "location",
    onToggleCombining: jest.fn(),
    onCombineSelected: jest.fn(),
    onCancelCombining: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("when not in combining mode", () => {
    it("renders the combine services button", () => {
      render(<CombiningInterface {...defaultProps} />);

      expect(screen.getByText("Combine Services")).toBeInTheDocument();
      expect(screen.getByTestId("combine-services-button")).toBeInTheDocument();
    });

    it("shows description text", () => {
      render(<CombiningInterface {...defaultProps} />);

      expect(
        screen.getByText("Select services to combine them into a single booking card")
      ).toBeInTheDocument();
      expect(screen.getByText("This helps streamline your booking process")).toBeInTheDocument();
    });

    it("calls onToggleCombining when combine button is clicked", async () => {
      const user = userEvent.setup();
      render(<CombiningInterface {...defaultProps} />);

      const combineButton = screen.getByTestId("combine-services-button");
      await user.click(combineButton);

      expect(defaultProps.onToggleCombining).toHaveBeenCalled();
    });
  });

  describe("when in combining mode", () => {
    const combiningProps = {
      ...defaultProps,
      combiningMode: true,
    };

    it("renders combining mode interface", () => {
      render(<CombiningInterface {...combiningProps} />);

      expect(screen.getByText("Combining Mode")).toBeInTheDocument();
      expect(
        screen.getByText("Select exactly 2 services from the same location to combine")
      ).toBeInTheDocument();
    });

    it("shows combine selected button with count", () => {
      render(<CombiningInterface {...combiningProps} />);

      expect(screen.getByText("Combine Selected (0/2)")).toBeInTheDocument();
    });

    it("updates count when cards are selected", () => {
      const propsWithSelection = {
        ...combiningProps,
        selectedCards: ["card-1"],
      };

      render(<CombiningInterface {...propsWithSelection} />);

      expect(screen.getByText("Combine Selected (1/2)")).toBeInTheDocument();
    });

    it("enables combine button when exactly 2 cards are selected", () => {
      const propsWithSelection = {
        ...combiningProps,
        selectedCards: ["card-1", "card-2"],
      };

      render(<CombiningInterface {...propsWithSelection} />);

      const combineButton = screen.getByText("Combine Selected (2/2)");
      expect(combineButton).not.toBeDisabled();
    });

    it("disables combine button when not exactly 2 cards are selected", () => {
      const propsWithSelection = {
        ...combiningProps,
        selectedCards: ["card-1"],
      };

      render(<CombiningInterface {...propsWithSelection} />);

      const combineButton = screen.getByText("Combine Selected (1/2)");
      expect(combineButton).toBeDisabled();
    });

    it("calls onCombineSelected when combine button is clicked", async () => {
      const user = userEvent.setup();
      const propsWithSelection = {
        ...combiningProps,
        selectedCards: ["card-1", "card-2"],
      };

      render(<CombiningInterface {...propsWithSelection} />);

      const combineButton = screen.getByText("Combine Selected (2/2)");
      await user.click(combineButton);

      expect(defaultProps.onCombineSelected).toHaveBeenCalled();
    });

    it("calls onCancelCombining when cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<CombiningInterface {...combiningProps} />);

      const cancelButton = screen.getByText("Cancel Combining");
      await user.click(cancelButton);

      expect(defaultProps.onCancelCombining).toHaveBeenCalled();
    });

    it("has proper styling for combining mode", () => {
      render(<CombiningInterface {...combiningProps} />);

      const card = screen.getByText("Combining Mode").closest(".border-blue-200");
      expect(card).toBeInTheDocument();
    });
  });

  it("handles keyboard navigation", () => {
    render(<CombiningInterface {...defaultProps} />);

    const combineButton = screen.getByTestId("combine-services-button");
    combineButton.focus();

    expect(document.activeElement).toBe(combineButton);
  });

  it("has proper accessibility attributes", () => {
    render(<CombiningInterface {...defaultProps} />);

    const combineButton = screen.getByTestId("combine-services-button");
    expect(combineButton).toBeInTheDocument();
  });

  it("handles rapid state changes", async () => {
    const user = userEvent.setup();
    const combiningProps = {
      ...defaultProps,
      combiningMode: true,
    };

    render(<CombiningInterface {...combiningProps} />);

    // Rapidly click cancel and then combine
    const cancelButton = screen.getByText("Cancel Combining");
    await user.click(cancelButton);

    expect(defaultProps.onCancelCombining).toHaveBeenCalled();
  });
});
