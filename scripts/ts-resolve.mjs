// Lets plain-script tests run on Node 24 without tsx:
//   node --import ./scripts/ts-resolve.mjs src/lib/<name>.test.ts
// Node strips the TypeScript types itself. This hook only retries a relative
// import that has no extension (`./checkout`) as `./checkout.ts`, which is how
// the app's own imports are written.
import { register } from "node:module"

if (!process.env.__TS_RESOLVE_HOOK) {
  process.env.__TS_RESOLVE_HOOK = "1"
  register(import.meta.url)
}

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context)
  } catch (err) {
    const relative = specifier.startsWith("./") || specifier.startsWith("../")
    if (relative && !/\.[cm]?[jt]s$/.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context)
    }
    throw err
  }
}
