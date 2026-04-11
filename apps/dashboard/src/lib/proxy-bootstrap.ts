// Route undici/global fetch through the container egress proxy so node can
// reach hosts that aren't resolvable from inside the sandbox (e.g. Neon).
// Imported for side effects at the top of any script that opens network
// sockets from node (db-check, seed, reset-indexes, etc.).
//
// This file is intentionally a CLI-only utility (executed via tsx). `undici`
// is a transitive dependency of the Next.js runtime but is not declared in
// this package, so we require it dynamically to avoid pulling type decls
// into the dashboard build graph.
/* eslint-disable @typescript-eslint/no-require-imports */
const proxy =
  process.env.HTTPS_PROXY ||
  process.env.https_proxy ||
  process.env.HTTP_PROXY ||
  process.env.http_proxy;

if (proxy) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const undici = require('undici') as {
      setGlobalDispatcher: (d: unknown) => void;
      ProxyAgent: new (uri: string) => unknown;
    };
    undici.setGlobalDispatcher(new undici.ProxyAgent(proxy));
    // eslint-disable-next-line no-console
    console.log(`[proxy-bootstrap] routing fetch via ${proxy.split('@').pop()}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[proxy-bootstrap] undici not available; fetch may fail:', (err as Error).message);
  }
}
