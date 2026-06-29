// @vitest-environment jsdom

import assert from "node:assert/strict";
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  authCallback: null as null | ((user: any) => void),
  toast: vi.fn(), signOut: vi.fn(), loadDraft: vi.fn(), clearDraft: vi.fn(),
  saveDraftSettings: vi.fn(), saveDraftMedia: vi.fn(), fileToDataUrl: vi.fn(async (file: any) => `data:${file.name}`),
  exportProps: null as any,
}));

vi.mock("next/dynamic", () => ({ default: () => (props: any) => <div data-testid="video-preview" data-mode={props.mode} /> }));
vi.mock("../src/lib/auth", () => ({
  onAuthChange: (callback: (user: any) => void) => { state.authCallback = callback; return vi.fn(); },
  signOut: state.signOut,
}));
vi.mock("../src/lib/firebase", () => ({ isFirebaseConfigured: () => true }));
vi.mock("../src/lib/files", () => ({ fileToDataUrl: state.fileToDataUrl }));
vi.mock("../src/lib/project-draft", async () => {
  const actual = await vi.importActual<any>("../src/lib/project-draft");
  return {
    ...actual,
    loadDraft: state.loadDraft,
    clearDraft: state.clearDraft,
    saveDraftSettings: state.saveDraftSettings,
    saveDraftMedia: state.saveDraftMedia,
  };
});
vi.mock("../src/components/ui/Toast", () => ({
  ToastProvider: ({ children }: React.PropsWithChildren) => <>{children}</>,
  useToast: () => state.toast,
}));
vi.mock("../src/components/ui/BackgroundScene", () => ({ BackgroundScene: () => <div data-testid="background" /> }));
vi.mock("../src/components/ui/GlassCard", () => ({
  GlassCard: ({ title, badge, onToggle, children }: any) => <section><button onClick={onToggle}>{title}-{badge}</button>{children}</section>,
}));
vi.mock("../src/components/SignInModal", () => ({ SignInModal: () => <div>Sign-in modal</div> }));
vi.mock("../src/components/AiAgentsInstructionFab", () => ({ AiAgentsInstructionFab: () => <div>Agent instructions</div> }));
vi.mock("../src/components/theme-toggle", () => ({ ThemeToggle: () => <div>Theme</div> }));
vi.mock("../src/components/AiCopyAssistant", () => ({ AiCopyAssistant: ({ brandId }: any) => <div>AI-{brandId}</div> }));
vi.mock("../src/components/BrandMediaLibrary", () => ({ BrandMediaLibrary: ({ brandId }: any) => <div>Library-{brandId}</div> }));
vi.mock("../src/components/BrandSelector", () => ({
  BrandSelector: ({ brands, onSelect }: any) => <button onClick={() => onSelect(brands[1].id)}>Select second brand</button>,
}));
vi.mock("../src/components/CarouselSlidesEditor", () => ({
  CarouselSlidesEditor: ({ onChange }: any) => <button onClick={() => onChange([{ id: "slide", title: "Slide", file: new File(["s"], "slide.jpg"), url: "blob:slide" }])}>Add carousel slide</button>,
}));
vi.mock("../src/components/LogoPicker", () => ({
  LogoPicker: ({ onChange }: any) => <button onClick={() => onChange("logo.svg")}>Select logo</button>,
}));
vi.mock("../src/components/LogoPositionControls", () => ({
  LogoPositionControls: ({ onOffsetXChange, onOffsetYChange, disabled }: any) => <button disabled={disabled} onClick={() => { onOffsetXChange(12); onOffsetYChange(-12); }}>Move logo</button>,
}));
vi.mock("../src/components/MediaUploader", () => ({
  MediaUploader: ({ label, onFile, onPickFromLibrary }: any) => <div>
    <button onClick={() => onFile(new File([label], `${label}.jpg`))}>Upload {label}</button>
    {onPickFromLibrary ? <button onClick={async () => onFile(await onPickFromLibrary())}>Library {label}</button> : null}
  </div>,
}));
vi.mock("../src/components/ServiceFontPicker", () => ({
  ServiceFontPicker: ({ label, onChange }: any) => <button onClick={() => onChange("inter")}>{label}</button>,
}));
vi.mock("../src/components/BackgroundMusicControls", () => ({
  BackgroundMusicControls: ({ onBackgroundChange, onMusicChange }: any) => <button onClick={() => { onBackgroundChange("backgrounds/bg 1.mp4"); onMusicChange("music/song 1.mp3"); }}>Choose media</button>,
}));
vi.mock("../src/components/VideoDurationControl", () => ({
  VideoDurationControl: ({ onChange }: any) => <button onClick={() => onChange(12)}>Set duration</button>,
}));
vi.mock("../src/components/VideoTextColors", () => ({
  VideoTextColors: ({ onHeadlineChange, onCaptionChange }: any) => <button onClick={() => { onHeadlineChange("#111111"); onCaptionChange("#222222"); }}>Set colors</button>,
}));
vi.mock("../src/components/VideoTextSizeSlider", () => ({
  VideoTextSizeSlider: ({ onChange }: any) => <button onClick={() => onChange(1.2)}>Set text size</button>,
}));
vi.mock("../src/components/TemplateModePills", () => ({
  TemplateModePills: ({ onChange }: any) => <div>
    <button onClick={() => onChange("before-after")}>Mode before</button>
    <button onClick={() => onChange("single-image")}>Mode single</button>
    <button onClick={() => onChange("carousel")}>Mode carousel</button>
  </div>,
}));
vi.mock("../src/components/ExportBar", () => ({
  ExportBar: (props: any) => { state.exportProps = props; return <button onClick={() => props.onBusyChange(true)}>Begin export</button>; },
}));
vi.mock("../src/components/TweaksPanel", () => ({
  useTweaks: () => ({ state: { accent: "blue" }, setState: vi.fn() }),
  TweaksPanel: ({ open, onClose }: any) => open ? <button onClick={onClose}>Close tweaks</button> : null,
}));
vi.mock("../src/components/MediaLibraryPicker", () => ({
  MediaLibraryPicker: ({ open, onApply, onClose }: any) => open ? <div><button onClick={() => onApply([new File(["library"], "library.jpg")])}>Apply library</button><button onClick={onClose}>Close library</button></div> : null,
}));

import { DashboardClient } from "../src/app/dashboard-client";

const emptyDraftSettings = {
  version: 1, savedAt: 1, templateMode: "single-image", activeBrandId: "le-motor",
  logoFile: "logo.svg", showLogo: true, logoOffsetXPx: 1, logoOffsetYPx: 2,
  serviceTitle: "Service", subtitleText: "Subtitle", showPriceTag: true, priceTagText: "$10",
  brandTitleFontId: "outfit", serviceFontId: "inter", headlineColorHex: "#111111",
  captionColorHex: "#222222", textSizeScale: 1.1, backgroundPath: "backgrounds/a.mp4",
  musicPath: "music/a.mp3", durationSeconds: 8, showBeforeAfterArrow: false,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.authCallback = null;
  state.exportProps = null;
  state.loadDraft.mockResolvedValue(null);
  state.fileToDataUrl.mockImplementation(async (file: File) => `data:${file.name}`);
  vi.restoreAllMocks();
});

function authenticate(user: any = { uid: "user", displayName: "User", photoURL: "photo.jpg" }) {
  act(() => state.authCallback?.(user));
}

describe("DashboardClient", () => {
  it("moves through auth, configuration modes, media selection, preview, and export input", async () => {
    state.loadDraft.mockResolvedValue(null);
    globalThis.fetch = vi.fn(async () => Response.json({ music: [], backgrounds: [] }));
    Object.defineProperties(URL, {
      createObjectURL: { configurable: true, value: vi.fn((file: File) => `blob:${file.name}`) },
      revokeObjectURL: { configurable: true, value: vi.fn() },
    });
    render(<DashboardClient />);
    assert.ok(screen.getByTestId("background"));
    authenticate(null);
    assert.ok(screen.getByText("Sign-in modal"));
    authenticate();
    await waitFor(() => assert.ok(screen.getByRole("heading", { name: "VideoComposer" })));
    assert.equal(state.exportProps.canExport, false);

    fireEvent.click(screen.getByText("Select logo"));
    fireEvent.click(screen.getByText("Upload Before"));
    fireEvent.click(screen.getByText("Upload After"));
    await waitFor(() => assert.equal(state.exportProps.canExport, true));
    const beforeProps = await state.exportProps.getInputProps();
    assert.equal(beforeProps.topImageSrc, "data:Before.jpg");
    assert.equal(beforeProps.bottomImageSrc, "data:After.jpg");

    fireEvent.click(screen.getByText("Move logo"));
    fireEvent.click(screen.getByText("Choose media"));
    fireEvent.click(screen.getByText("Set duration"));
    fireEvent.click(screen.getByText("Set colors"));
    fireEvent.click(screen.getByText("Set text size"));
    fireEvent.click(screen.getByText("Brand title font"));
    fireEvent.click(screen.getByText("Service title font"));
    fireEvent.click(screen.getByText("Preview"));
    assert.equal(screen.getByTestId("video-preview").getAttribute("data-mode"), "before-after");

    fireEvent.click(screen.getByText("Mode single"));
    fireEvent.click(await screen.findByText("Upload Hero image"));
    const singleProps = await state.exportProps.getInputProps();
    assert.equal(singleProps.imageSrc, "data:Hero image.jpg");

    fireEvent.click(screen.getByText("Mode carousel"));
    fireEvent.click(await screen.findByText("Add carousel slide"));
    const carouselProps = await state.exportProps.getInputProps();
    assert.equal(carouselProps.slides[0].imageSrc, "data:slide.jpg");

    fireEvent.click(screen.getByText("Tweaks"));
    fireEvent.click(screen.getByText("Close tweaks"));
    fireEvent.click(screen.getByText("Begin export"));
    assert.ok(screen.getByText("Rendering video"));
    fireEvent.click(screen.getByText("Sign out"));
    assert.equal(state.signOut.mock.calls.length, 1);
  });

  it("opens the library picker and resolves selected files", async () => {
    state.loadDraft.mockResolvedValue(null);
    globalThis.fetch = vi.fn(async () => Response.json({}));
    render(<DashboardClient />);
    authenticate({ uid: "user", displayName: null, photoURL: null });
    fireEvent.click(await screen.findByText("Library Before"));
    fireEvent.click(screen.getByText("Apply library"));
    await waitFor(() => assert.equal((URL.createObjectURL as any).mock?.calls.length ?? 0, 0));
  });

  it("offers, resumes, and discards a stored draft", async () => {
    const draft = {
      settings: emptyDraftSettings,
      media: {
        beforeFile: null,
        afterFile: null,
        singleFile: new File(["hero"], "hero.jpg"),
        carouselSlides: [{ id: "saved", title: "Saved", file: null }],
      },
    };
    state.loadDraft.mockResolvedValue(draft);
    globalThis.fetch = vi.fn(async () => Response.json({ music: [], backgrounds: [] }));
    Object.defineProperties(URL, {
      createObjectURL: { configurable: true, value: vi.fn((file: File) => `blob:${file.name}`) },
      revokeObjectURL: { configurable: true, value: vi.fn() },
    });
    const first = render(<DashboardClient />);
    authenticate();
    fireEvent.click(await screen.findByText("Resume"));
    await waitFor(() => assert.equal(screen.getByTestId("video-preview").getAttribute("data-mode"), "single-image"));
    assert.equal(state.toast.mock.calls.some((call) => call[0] === "Resumed your previous project"), true);
    first.unmount();

    state.loadDraft.mockResolvedValue(draft);
    render(<DashboardClient />);
    authenticate();
    fireEvent.click(await screen.findByText("Start fresh"));
    assert.equal(state.clearDraft.mock.calls.length, 1);
  });
});
