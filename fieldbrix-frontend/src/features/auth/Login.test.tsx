import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Login } from "./Login";

describe("Login component", () => {
  it("renders username and password inputs with submit button", () => {
    const handleSubmit = vi.fn();
    const setIdentifier = vi.fn();
    const setPassword = vi.fn();
    const onForgot = vi.fn();

    render(
      <Login
        identifier="test@example.com"
        password="secret"
        setIdentifier={setIdentifier}
        setPassword={setPassword}
        onSubmit={handleSubmit}
        error=""
        busy={false}
        onForgot={onForgot}
      />,
    );

    expect(screen.getByDisplayValue("test@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("secret")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue to workspace/i })).toBeInTheDocument();
  });

  it("displays error message when provided", () => {
    render(
      <Login
        identifier=""
        password=""
        setIdentifier={vi.fn()}
        setPassword={vi.fn()}
        onSubmit={vi.fn()}
        error="Invalid credentials"
        busy={false}
        onForgot={vi.fn()}
      />,
    );

    expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
  });

  it("toggles forgot password form when link clicked", () => {
    render(
      <Login
        identifier="user@example.com"
        password=""
        setIdentifier={vi.fn()}
        setPassword={vi.fn()}
        onSubmit={vi.fn()}
        error=""
        busy={false}
        onForgot={vi.fn()}
      />,
    );

    const forgotBtn = screen.getByRole("button", { name: /forgot password\?/i });
    fireEvent.click(forgotBtn);

    expect(screen.getByRole("button", { name: /send reset instructions/i })).toBeInTheDocument();
  });
});
