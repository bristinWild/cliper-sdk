export interface MemoryProvider {
    upload(): Promise<void>;
}