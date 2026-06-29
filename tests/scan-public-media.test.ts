import assert from "node:assert/strict";
import { describe, it, vi } from "vitest";

const { readdir } = vi.hoisted(() => ({ readdir: vi.fn() }));
vi.mock("fs/promises", () => ({ readdir }));

import { scanPublicMedia } from "../src/lib/scan-public-media";

type Entry = { name: string; isDirectory: () => boolean; isFile: () => boolean };
const file = (name: string): Entry => ({ name, isDirectory: () => false, isFile: () => true });
const dir = (name: string): Entry => ({ name, isDirectory: () => true, isFile: () => false });
const other = (name: string): Entry => ({ name, isDirectory: () => false, isFile: () => false });

describe("scanPublicMedia", () => {
  it("walks recursively, skips hidden entries, filters extensions, and sorts labels", async () => {
    readdir.mockImplementation(async (pathValue: unknown) => {
      const path = String(pathValue).replaceAll("\\", "/");
      if (path.endsWith("/public/music")) {
        return [
          file("Zulu.MP3"),
          file("cover.jpg"),
          dir("nested"),
          file("_skip.wav"),
          other("pipe"),
        ];
      }
      if (path.endsWith("/public/music/nested")) return [file("alpha.wav"), file(".hidden.mp3")];
      if (path.endsWith("/public/background music")) return [file("shared.m4a"), file("Scene.MP4")];
      if (path.endsWith("/public/backgrounds")) return [file("Beach.webp"), file("notes.txt")];
      throw new Error("missing directory");
    });

    const result = await scanPublicMedia();
    assert.deepEqual(
      result.music.map((asset) => asset.label),
      ["alpha.wav", "shared.m4a", "Zulu.MP3"],
    );
    assert.deepEqual(
      result.backgrounds.map((asset) => asset.label),
      ["Beach.webp", "Scene.MP4"],
    );
    assert.equal(result.music[0]!.id, "music/nested/alpha.wav");
    assert.equal(result.backgrounds[0]!.publicPath, "backgrounds/Beach.webp");
  });
});
