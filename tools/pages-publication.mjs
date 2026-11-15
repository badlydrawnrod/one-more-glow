/**
 * Explicit allowlist for the combined GitHub Pages site. Adding a workspace to
 * npm workspaces does not publish it; add it here only after its route and PWA
 * assets are ready.
 */
export const publishedApps = [
  { workspace: "very-angry-robots", route: "/very-angry-robots/" },
  { workspace: "diagnostics", route: "/test-card/", defaultScene: "testcard" },
];

export const pagesOutputDirectory = ".pages-output";
