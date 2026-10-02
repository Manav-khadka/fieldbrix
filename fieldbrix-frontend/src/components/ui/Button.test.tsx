import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "./Button";

describe("Button component", () => {
  it("renders children text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("handles click events", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Action</Button>);
    fireEvent.click(screen.getByRole("button", { name: /action/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("disables button when disabled or isLoading is true", () => {
    const { rerender } = render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();

    rerender(<Button isLoading>Loading</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("applies correct variant and size classes", () => {
    const { container } = render(
      <Button variant="danger" size="lg" fullWidth>
        Delete
      </Button>,
    );
    const button = container.querySelector("button");
    expect(button).toHaveClass("fb-btn-danger");
    expect(button).toHaveClass("fb-btn-lg");
    expect(button).toHaveClass("fb-btn-full");
  });
});
