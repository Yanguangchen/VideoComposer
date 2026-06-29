// @vitest-environment jsdom

import assert from "node:assert/strict"; import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, it, vi } from "vitest";

import { AiAgentsInstructionFab } from "../src/components/AiAgentsInstructionFab";
import { BackgroundMusicControls } from "../src/components/BackgroundMusicControls";
import { BrandSelector } from "../src/components/BrandSelector";
import { LogoPositionControls } from "../src/components/LogoPositionControls";
import { ServiceFontPicker } from "../src/components/ServiceFontPicker";
import { TemplateModePills } from "../src/components/TemplateModePills";
import { TemplateModeToggle } from "../src/components/TemplateModeToggle";
import { VideoDurationControl } from "../src/components/VideoDurationControl";
import { VideoTextColors } from "../src/components/VideoTextColors";
import { VideoTextSizeSlider } from "../src/components/VideoTextSizeSlider";
import { BackgroundScene } from "../src/components/ui/BackgroundScene";
import { brands } from "../src/config/brands";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("simple selection controls", () => {
  it("selects brands and marks the active brand", () => {
    const onSelect = vi.fn();
    render(<BrandSelector brands={brands.slice(0, 2)} activeBrandId={brands[0]!.id} onSelect={onSelect} />);
    const first = screen.getByTitle(brands[0]!.displayName);
    const second = screen.getByTitle(brands[1]!.displayName);
    assert.match(first.className, /border-accent/);
    assert.match(second.className, /border-slate/);
    fireEvent.click(second);
    assert.deepEqual(onSelect.mock.calls[0], [brands[1]!.id]);
  });

  it("selects service fonts and falls back for invalid values", () => {
    const onChange = vi.fn();
    render(<ServiceFontPicker value="outfit" onChange={onChange} />);
    const select = screen.getByRole("listbox");
    fireEvent.change(select, { target: { value: "inter" } });
    fireEvent.change(select, { target: { value: "invalid" } });
    assert.deepEqual(onChange.mock.calls.map((call) => call[0]), ["inter", "outfit"]);
    assert.ok(screen.getByText("Service / caption font"));
  });

  it("renders every mode pill/icon and changes mode", () => {
    const onChange = vi.fn();
    render(<TemplateModePills value="before-after" onChange={onChange} />);
    const radios = screen.getAllByRole("radio");
    assert.equal(radios.length, 3);
    assert.equal(radios[0]!.getAttribute("aria-checked"), "true");
    fireEvent.click(radios[2]!);
    assert.deepEqual(onChange.mock.calls[0], ["carousel"]);
    assert.equal(document.querySelectorAll("svg").length, 3);
  });

  it("shows mode-specific help and changes toggle mode", () => {
    const onChange = vi.fn();
    const { rerender } = render(<TemplateModeToggle value="before-after" onChange={onChange} />);
    assert.equal(screen.queryByText(/Single-image mode/), null);
    fireEvent.click(screen.getByText("Single image"));
    assert.deepEqual(onChange.mock.calls[0], ["single-image"]);
    rerender(<TemplateModeToggle value="single-image" onChange={onChange} />);
    assert.ok(screen.getByText(/Single-image mode/));
    rerender(<TemplateModeToggle value="carousel" onChange={onChange} />);
    assert.ok(screen.getByText(/Carousel cycles/));
  });
});

describe("numeric and color controls", () => {
  it("clamps duration changes and resets", () => {
    const onChange = vi.fn();
    render(<VideoDurationControl durationSeconds={200} onChange={onChange} />);
    assert.ok(screen.getByText("90.0 seconds"));
    const inputs = screen.getAllByRole("slider");
    fireEvent.change(inputs[0]!, { target: { value: "1" } });
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "22.5" } });
    fireEvent.click(screen.getByText(/Reset to 5s/));
    assert.deepEqual(onChange.mock.calls.map((call) => call[0]), [2, 22.5, 5]);
  });

  it("clamps text size and resets", () => {
    const onChange = vi.fn();
    render(<VideoTextSizeSlider value={99} onChange={onChange} />);
    assert.ok(screen.getByText("165%"));
    fireEvent.change(screen.getByLabelText("Video text size scale"), { target: { value: "0.5" } });
    fireEvent.click(screen.getByText("Reset to 100%"));
    assert.deepEqual(onChange.mock.calls.map((call) => call[0]), [0.65, 1]);
  });

  it("updates and resets headline and caption colors", () => {
    const onHeadlineChange = vi.fn();
    const onCaptionChange = vi.fn();
    render(<VideoTextColors
      headlineColorHex="invalid"
      captionColorHex="#123456"
      defaultHeadlineHex="#abcdef"
      onHeadlineChange={onHeadlineChange}
      onCaptionChange={onCaptionChange}
    />);
    const textboxes = screen.getAllByRole("textbox");
    fireEvent.change(textboxes[0]!, { target: { value: "#111111" } });
    fireEvent.change(textboxes[1]!, { target: { value: "#222222" } });
    fireEvent.click(screen.getByText("Reset to white"));
    assert.deepEqual(onHeadlineChange.mock.calls.map((call) => call[0]), ["#111111", "#abcdef"]);
    assert.deepEqual(onCaptionChange.mock.calls[0], ["#222222"]);
  });

  it("changes, clamps, resets, and disables logo offsets", () => {
    const onX = vi.fn();
    const onY = vi.fn();
    const { rerender } = render(<LogoPositionControls
      offsetXPx={500}
      offsetYPx={-500}
      onOffsetXChange={onX}
      onOffsetYChange={onY}
    />);
    fireEvent.change(screen.getByLabelText("Logo horizontal offset"), { target: { value: "300" } });
    fireEvent.change(screen.getByLabelText("Logo vertical offset"), { target: { value: "-300" } });
    fireEvent.click(screen.getByText("Reset position"));
    assert.deepEqual(onX.mock.calls.map((call) => call[0]), [300, 0]);
    assert.deepEqual(onY.mock.calls.map((call) => call[0]), [-300, 0]);
    rerender(<LogoPositionControls offsetXPx={0} offsetYPx={0} onOffsetXChange={onX} onOffsetYChange={onY} disabled />);
    assert.equal((screen.getByText("Reset position") as HTMLButtonElement).disabled, true);
  });
});

describe("media and ambient controls", () => {
  it("shows loading and empty states", () => {
    const props = {
      backgroundOptions: [], musicOptions: [], backgroundPath: null, musicPath: null,
      onBackgroundChange: vi.fn(), onMusicChange: vi.fn(),
    };
    const { rerender } = render(<BackgroundMusicControls {...props} mediaLoading />);
    assert.ok(screen.getByText(/Scanning public folders/));
    assert.equal((screen.getAllByRole("combobox")[0] as HTMLSelectElement).disabled, true);
    rerender(<BackgroundMusicControls {...props} mediaLoading={false} />);
    assert.ok(screen.getByText(/No backdrop files found/));
    assert.ok(screen.getByText(/No music found/));
  });

  it("selects and clears background and music assets", () => {
    const onBackgroundChange = vi.fn();
    const onMusicChange = vi.fn();
    const assets = [{ id: "a", label: "Asset", publicPath: "folder/asset.mp4" }];
    render(<BackgroundMusicControls
      backgroundOptions={assets}
      musicOptions={assets}
      backgroundPath={null}
      musicPath={null}
      onBackgroundChange={onBackgroundChange}
      onMusicChange={onMusicChange}
      mediaLoading={false}
    />);
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0]!, { target: { value: "folder/asset.mp4" } });
    fireEvent.change(selects[0]!, { target: { value: "" } });
    fireEvent.change(selects[1]!, { target: { value: "folder/asset.mp4" } });
    fireEvent.change(selects[1]!, { target: { value: "" } });
    assert.deepEqual(onBackgroundChange.mock.calls.map((call) => call[0]), ["folder/asset.mp4", null]);
    assert.deepEqual(onMusicChange.mock.calls.map((call) => call[0]), ["folder/asset.mp4", null]);
  });

  it("opens agent instructions and renders the ambient scene", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<><AiAgentsInstructionFab /><BackgroundScene /></>);
    fireEvent.click(screen.getByRole("button", { name: /Open Instruction/ }));
    assert.deepEqual(open.mock.calls[0], ["/VideoComposerInstruction.json", "_blank", "noopener,noreferrer"]);
    assert.ok(document.querySelector(".bg-scene"));
  });
});
