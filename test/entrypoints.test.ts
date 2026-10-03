// @vitest-environment node
/// <reference types="vite/client" />
import { describe, expect, it, vi } from "vitest";
import pkgSource from "../package.json?raw";

const pkg = JSON.parse(pkgSource);
const coreSources = import.meta.glob<string>("../src/core/*.ts", { query: "?raw", import: "default", eager: true });

describe("ime-safe (Core entry)", () => {
  it("exports only the framework-agnostic API", async () => {
    const core = await import("../src/core");
    expect(Object.keys(core).sort()).toEqual(["createIMESafeEnterHandler", "isIMEComposing"]);
  });

  it("imports and runs without React or browser globals", async () => {
    expect(typeof window).toBe("undefined");
    vi.resetModules();
    vi.doMock("react", () => {
      throw new Error("Core must not import react");
    });
    try {
      const { createIMESafeEnterHandler, isIMEComposing } = await import("../src/core");
      const onEnter = vi.fn();
      createIMESafeEnterHandler({ onEnter })({ key: "Enter" });
      expect(onEnter).toHaveBeenCalledTimes(1);
      expect(isIMEComposing({ keyCode: 229 })).toBe(true);
    } finally {
      vi.doUnmock("react");
      vi.resetModules();
    }
  });

  it("keeps every Core module free of imports outside src/core", () => {
    expect(Object.keys(coreSources)).toContain("../src/core/index.ts");
    for (const [file, source] of Object.entries(coreSources)) {
      const specifiers = [...source.matchAll(/\bfrom\s+["']([^"']+)["']|\bimport\s*\(?\s*["']([^"']+)["']/g)]
        .map((match) => match[1] ?? match[2]);
      for (const specifier of specifiers) expect(specifier, file).toMatch(/^\.\/[^/]+$/);
    }
  });
});

describe("ime-safe/react", () => {
  it("exports the React hooks", async () => {
    const react = await import("../src/react");
    expect(Object.keys(react).sort()).toEqual(["useIME", "useIMESafeEnter"]);
  });
});

describe("package.json", () => {
  const core = {
    types: "./dist/core/index.d.ts",
    import: "./dist/core/index.js",
    default: "./dist/core/index.js",
  };

  it("maps the root and the legacy ./core alias to the same Core build", () => {
    expect(pkg.exports["."]).toEqual(core);
    expect(pkg.exports["./core"]).toEqual(core);
    expect(pkg.main).toBe(core.default);
    expect(pkg.types).toBe(core.types);
  });

  it("exposes React helpers only through ./react", () => {
    expect(pkg.exports["./react"]).toEqual({
      types: "./dist/react/index.d.ts",
      import: "./dist/react/index.js",
      default: "./dist/react/index.js",
    });
  });

  it("makes React an optional peer dependency", () => {
    expect(pkg.peerDependencies.react).toBe(">=17");
    expect(pkg.peerDependenciesMeta.react.optional).toBe(true);
    expect(pkg).not.toHaveProperty("dependencies.react");
  });
});
