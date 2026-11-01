// Minimal built-in Node API types used by source-level Vitest checks.
// The application itself targets browsers and does not depend on @types/node.
declare module 'node:fs' {
    export function readFileSync(path: URL, encoding: 'utf8'): string;
    export function readdirSync(path: URL, options: { withFileTypes: true }): { name: string; isDirectory(): boolean }[];
}
