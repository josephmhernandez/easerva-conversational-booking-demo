import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import RebuildButton from "../RebuildButton";

describe("RebuildButton", () => {
  const alertMock = jest.fn();

  beforeEach(() => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
    (global as typeof globalThis & { alert: typeof alert }).alert = alertMock;
    alertMock.mockClear();
  });

  it('renders "Rebuild" button in idle state', () => {
    render(<RebuildButton businessId="biz-1" />);
    expect(screen.getByRole("button", { name: "Rebuild" })).toBeInTheDocument();
  });

  it("click shows loading text", async () => {
    let release!: () => void;
    (global.fetch as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ ok: true });
        })
    );

    render(<RebuildButton businessId="biz-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Rebuild" }));

    expect(screen.getByRole("button", { name: "Rebuilding..." })).toBeDisabled();
    release();
    await waitFor(() => expect(alertMock).toHaveBeenCalledWith("Rebuild triggered"));
  });

  it("successful API response shows success indicator", async () => {
    render(<RebuildButton businessId="biz-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Rebuild" }));

    await waitFor(() => expect(alertMock).toHaveBeenCalledWith("Rebuild triggered"));
  });

  it("API error shows error message", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
    render(<RebuildButton businessId="biz-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Rebuild" }));

    await waitFor(() => expect(alertMock).toHaveBeenCalledWith("Rebuild failed"));
  });

  it("disabled while loading (no double-submit)", async () => {
    let release!: () => void;
    (global.fetch as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ ok: true });
        })
    );

    render(<RebuildButton businessId="biz-1" />);
    const button = screen.getByRole("button", { name: "Rebuild" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    release();
    await waitFor(() => expect(alertMock).toHaveBeenCalled());
  });
});
