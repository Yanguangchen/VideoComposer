// @vitest-environment jsdom

import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithGoogle: vi.fn(),
  setTheme: vi.fn(),
  resolvedTheme: "light" as string,
  providerProps: vi.fn(),
}));
vi.mock("../src/lib/auth", () => ({ signInWithGoogle: mocks.signInWithGoogle }));
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: mocks.resolvedTheme, setTheme: mocks.setTheme }),
  ThemeProvider: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
    mocks.providerProps(props);
    return <div data-testid="theme-provider">{children}</div>;
  },
}));

import { DashboardStepAccordion } from "../src/components/DashboardStepAccordion";
import { SignInModal } from "../src/components/SignInModal";
import { ThemeProvider } from "../src/components/theme-provider";
import { ThemeToggle } from "../src/components/theme-toggle";
import { GlassCard } from "../src/components/ui/GlassCard";
import { ToastProvider, useToast, useToastSignal, useWhenTrue } from "../src/components/ui/Toast";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
  mocks.resolvedTheme = "light";
});

describe("GlassCard", () => {
  it("renders a static strong card and every badge kind", () => {
    const { rerender } = render(<GlassCard id="card" title="Title" badge="required" open onToggle={() => {}} alwaysOpen strongBorder>Body</GlassCard>);
    assert.ok(screen.getByText("Required"));
    assert.match(screen.getByText("Title").closest("section")!.className, /glass-card--strong/);
    rerender(<GlassCard id="card" title="Title" badge="done" open onToggle={() => {}} alwaysOpen>Body</GlassCard>);
    assert.ok(screen.getByText("Done"));
    rerender(<GlassCard id="card" title="Title" badge="optional" open onToggle={() => {}} alwaysOpen>Body</GlassCard>);
    assert.ok(screen.getByText("Optional"));
  });

  it("toggles collapsible cards and hides hints while open", () => {
    const onToggle = vi.fn();
    const { rerender } = render(<GlassCard id="card" title="Title" hint="Helpful" open={false} onToggle={onToggle}>Body</GlassCard>);
    const button = screen.getByRole("button");
    assert.equal(button.getAttribute("aria-expanded"), "false");
    assert.ok(screen.getByText("Helpful"));
    fireEvent.click(button);
    assert.equal(onToggle.mock.calls.length, 1);
    rerender(<GlassCard id="card" title="Title" hint="Helpful" open onToggle={onToggle}>Body</GlassCard>);
    assert.equal(screen.queryByText("Helpful"), null);
    assert.equal(screen.getByRole("region").getAttribute("aria-hidden"), "false");
  });
});

describe("Toast helpers", () => {
  function Trigger({ tone = "success" }: { tone?: "success" | "error" | "info" }) {
    const toast = useToastSignal();
    return <button onClick={() => toast("Message", tone)}>Show</button>;
  }

  it("shows all tones and automatically removes notifications", () => {
    vi.useFakeTimers();
    const { rerender } = render(<ToastProvider><Trigger /></ToastProvider>);
    fireEvent.click(screen.getByText("Show"));
    assert.match(screen.getByText("Message").className, /emerald/);
    rerender(<ToastProvider><Trigger tone="error" /></ToastProvider>);
    fireEvent.click(screen.getByText("Show"));
    assert.match(screen.getAllByText("Message")[1]!.className, /red/);
    rerender(<ToastProvider><Trigger tone="info" /></ToastProvider>);
    fireEvent.click(screen.getByText("Show"));
    assert.match(screen.getAllByText("Message")[2]!.className, /slate/);
    act(() => vi.advanceTimersByTime(3200));
    assert.equal(screen.queryByText("Message"), null);
  });

  it("provides a safe fallback and runs effects only when true", () => {
    const fallback = renderHook(() => useToast());
    assert.doesNotThrow(() => fallback.result.current("ignored"));
    const effect = vi.fn();
    const hook = renderHook(({ trigger }) => useWhenTrue(trigger, effect), { initialProps: { trigger: false } });
    assert.equal(effect.mock.calls.length, 0);
    hook.rerender({ trigger: true });
    assert.equal(effect.mock.calls.length, 1);
    hook.rerender({ trigger: false });
    assert.equal(effect.mock.calls.length, 1);
  });
});

describe("theme controls", () => {
  it("renders a server-safe placeholder before mounting", () => {
    const html = renderToString(<ThemeToggle />);
    assert.match(html, /opacity-50/);
  });

  it("switches between dark and light themes", () => {
    mocks.resolvedTheme = "dark";
    const { rerender } = render(<ThemeToggle />);
    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    assert.equal(checkbox.checked, true);
    fireEvent.click(checkbox);
    assert.deepEqual(mocks.setTheme.mock.calls[0], ["light"]);
    mocks.resolvedTheme = "light";
    rerender(<ThemeToggle />);
    fireEvent.click(screen.getByRole("checkbox"));
    assert.deepEqual(mocks.setTheme.mock.calls[1], ["dark"]);
  });

  it("passes fixed application theme settings to next-themes", () => {
    render(<ThemeProvider><span>Child</span></ThemeProvider>);
    assert.ok(screen.getByText("Child"));
    assert.deepEqual(mocks.providerProps.mock.calls[0]![0], {
      attribute: "class",
      defaultTheme: "light",
      enableSystem: false,
      disableTransitionOnChange: true,
    });
  });
});

describe("dashboard accordion", () => {
  it("opens and closes while preserving accessible region state", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<DashboardStepAccordion id="media" title="Media" openId={null} onOpenChange={onOpenChange} accent="indigo">Body</DashboardStepAccordion>);
    fireEvent.click(screen.getByRole("button"));
    assert.deepEqual(onOpenChange.mock.calls[0], ["media"]);
    assert.equal(screen.getByRole("region", { hidden: true }).getAttribute("aria-hidden"), "true");
    rerender(<DashboardStepAccordion id="media" title="Media" openId="media" onOpenChange={onOpenChange} accent="orange">Body</DashboardStepAccordion>);
    fireEvent.click(screen.getByRole("button"));
    assert.deepEqual(onOpenChange.mock.calls[1], [null]);
    assert.equal(screen.getByRole("region").getAttribute("aria-hidden"), "false");
  });
});

describe("SignInModal", () => {
  it("signs in successfully", async () => {
    mocks.signInWithGoogle.mockResolvedValue({ uid: "user" });
    const onSuccess = vi.fn();
    render(<SignInModal onSuccess={onSuccess} />);
    await act(async () => fireEvent.click(screen.getByText("Sign in with Google")));
    assert.equal(onSuccess.mock.calls.length, 1);
  });

  it("shows ordinary failures and suppresses popup cancellation messages", async () => {
    const onSuccess = vi.fn();
    mocks.signInWithGoogle.mockRejectedValueOnce(new Error("network failed"));
    const { rerender } = render(<SignInModal onSuccess={onSuccess} />);
    await act(async () => fireEvent.click(screen.getByText("Sign in with Google")));
    assert.ok(screen.getByRole("alert"));

    mocks.signInWithGoogle.mockRejectedValueOnce(new Error("popup-closed-by-user"));
    rerender(<SignInModal onSuccess={onSuccess} />);
    await act(async () => fireEvent.click(screen.getByText("Sign in with Google")));
    assert.equal(screen.queryByRole("alert"), null);

    mocks.signInWithGoogle.mockRejectedValueOnce("cancelled-popup-request");
    await act(async () => fireEvent.click(screen.getByText("Sign in with Google")));
    assert.equal(screen.queryByRole("alert"), null);
  });

  it("disables the button and shows loading text while pending", async () => {
    let resolve!: () => void;
    mocks.signInWithGoogle.mockReturnValue(new Promise<void>((done) => { resolve = done; }));
    render(<SignInModal onSuccess={() => {}} />);
    act(() => fireEvent.click(screen.getByText("Sign in with Google")));
    assert.equal((screen.getByRole("button") as HTMLButtonElement).disabled, true);
    assert.ok(screen.getByText("Signing in…"));
    await act(async () => resolve());
  });
});
