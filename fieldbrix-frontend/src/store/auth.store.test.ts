import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "./auth.store";

describe("useAuthStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().logout();
  });

  it("initializes with null auth when localStorage is empty", () => {
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("stores token and updates isAuthenticated on setAuth", () => {
    useAuthStore.getState().setAuth("test-token-123", "refresh-token-456", {
      id: "u-1",
      name: "Admin User",
      email: "admin@fieldbrix.local",
    });

    const state = useAuthStore.getState();
    expect(state.token).toBe("test-token-123");
    expect(state.refreshToken).toBe("refresh-token-456");
    expect(state.user?.name).toBe("Admin User");
    expect(state.isAuthenticated).toBe(true);
    expect(localStorage.getItem("fieldbrix_token")).toBe("test-token-123");
  });

  it("clears token and state on logout", () => {
    useAuthStore.getState().setAuth("test-token-123");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(localStorage.getItem("fieldbrix_token")).toBeNull();
  });
});
