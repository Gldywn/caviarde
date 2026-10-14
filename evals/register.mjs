import { registerHooks } from "node:module";
import { extname } from "node:path";

// src/ imports its siblings without an extension, which bundlers accept and
// Node's ESM resolver refuses. Retrying with ".ts" lets Node's own type
// stripping run the harness with no build step and no extra dependency.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      const retry =
        error?.code === "ERR_MODULE_NOT_FOUND" &&
        specifier.startsWith(".") &&
        extname(specifier) === "";
      if (!retry) throw error;
      return nextResolve(`${specifier}.ts`, context);
    }
  },
});
