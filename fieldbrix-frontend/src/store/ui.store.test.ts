import { describe, it, expect, beforeEach } from "vitest";
import { useUiStore } from "./ui.store";

describe("useUiStore", () => {
  beforeEach(() => {
    useUiStore.getState().clearToasts();
    useUiStore.getState().setSidebarCollapsed(false);
  });

  it("adds and removes toast items", () => {
    const id = useUiStore.getState().addToast({
      type: "success",
      title: "Success",
      message: "Operation completed",
      duration: 0,
    });

    expect(useUiStore.getState().toasts.length).toBe(1);
    expect(useUiStore.getState().toasts[0].id).toBe(id);
    expect(useUiStore.getState().toasts[0].message).toBe("Operation completed");

    useUiStore.getState().removeToast(id);
    expect(useUiStore.getState().toasts.length).toBe(0);
  });

  it("toggles sidebar collapsed state", () => {
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
  });
});
