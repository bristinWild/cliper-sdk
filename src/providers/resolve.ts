import { MemoryProvider } from "./memoryProvider";
import { CogneeProvider } from "./cognee/provider";
import { LocalJsonProvider } from "./local-json/provider";

/**
 * Providers are tried in this order; the first one with credentials
 * present wins. Cognee stays first so existing setups are unaffected by
 * adding a second provider — Local JSON only activates once someone
 * explicitly runs `cliper auth local-json`.
 */
const PROVIDERS: MemoryProvider[] = [
    new CogneeProvider(),
    new LocalJsonProvider(),
];

export function resolveProvider(): MemoryProvider | undefined {
    return PROVIDERS.find((p) => p.isConfigured());
}
