import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BookingRequestForm from "../BookingRequestForm";

describe("BookingRequestForm", () => {
  const slots = [{ start: "2026-03-03T14:00:00.000Z", end: "2026-03-03T15:00:00.000Z" }];

  beforeEach(() => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
  });

  it("renders form fields", () => {
    render(<BookingRequestForm slug="my-biz" slots={slots} />);

    expect(screen.getByPlaceholderText("Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByPlaceholderText("Phone")).toBeInTheDocument();
  });

  it("shows required validation attributes on empty submit", () => {
    render(<BookingRequestForm slug="my-biz" slots={slots} />);

    fireEvent.click(screen.getByRole("button", { name: /request booking/i }));

    expect(screen.getByPlaceholderText("Name")).toBeRequired();
    expect(screen.getByPlaceholderText("Email")).toBeRequired();
    expect(screen.getByPlaceholderText("Phone")).toBeRequired();
  });

  it("invalid email format is rejected by input", () => {
    render(<BookingRequestForm slug="my-biz" slots={slots} />);

    const email = screen.getByPlaceholderText("Email") as HTMLInputElement;
    fireEvent.change(email, { target: { value: "not-an-email" } });

    expect(email.validity.valid).toBe(false);
  });

  it("successful submit shows success state", async () => {
    const { container } = render(<BookingRequestForm slug="my-biz" slots={slots} />);

    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: "2026-03-03" } });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: slots[0].start } });
    fireEvent.change(screen.getByPlaceholderText("Name"), { target: { value: "Jane" } });
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "jane@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Phone"), { target: { value: "1234567890" } });

    fireEvent.click(screen.getByRole("button", { name: /request booking/i }));

    await waitFor(() => expect(screen.getByText("Booking request sent.")).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/book/my-biz",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("API error shows error message", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
    const { container } = render(<BookingRequestForm slug="my-biz" slots={slots} />);

    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: "2026-03-03" } });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: slots[0].start } });
    fireEvent.change(screen.getByPlaceholderText("Name"), { target: { value: "Jane" } });
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "jane@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Phone"), { target: { value: "1234567890" } });

    fireEvent.click(screen.getByRole("button", { name: /request booking/i }));

    await waitFor(() => expect(screen.getByText("Failed to submit request.")).toBeInTheDocument());
  });

  it("pre-fills date from prop", () => {
    const { container } = render(
      <BookingRequestForm slug="my-biz" slots={slots} date="2026-03-09" />
    );

    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput.value).toBe("2026-03-09");
  });

  it('shows "Contact for availability" when slots are empty', () => {
    render(<BookingRequestForm slug="my-biz" slots={[]} />);

    expect(screen.getByText("Contact for availability")).toBeInTheDocument();
  });
});
