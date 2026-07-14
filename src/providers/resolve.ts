import { MemoryProvider } from "./memoryProvider";
import { CogneeProvider } from "./cognee/provider";
import { LocalJsonProvider } from "./local-json/provider";

/** Every memory is synced to every configured provider, not just the first. */
const PROVIDERS: MemoryProvider[] = [
    new CogneeProvider(),
    new LocalJsonProvider(),
];

export function resolveProviders(): MemoryProvider[] {
    return PROVIDERS.filter((p) => p.isConfigured());
}
