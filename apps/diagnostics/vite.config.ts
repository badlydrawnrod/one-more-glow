import { defineConfig } from "vite";

const pagesBase = normalizePath(process.env.PAGES_BASE ?? "/");
const appRoute = normalizePath(process.env.APP_ROUTE ?? "/");

export default defineConfig({
  base: `${pagesBase}${appRoute.replace(/^\/+/, "")}`,
});

function normalizePath(value: string): string {
  if (!value.startsWith("/") || value.includes("?")) {
    throw new Error(`Expected a URL path beginning with /, received ${JSON.stringify(value)}.`);
  }
  const path = value.split("/").filter(Boolean).join("/");
  return path ? `/${path}/` : "/";
}
