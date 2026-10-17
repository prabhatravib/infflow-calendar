import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const hexaRoot = fileURLToPath(new URL('../../../../hexa-v2/', import.meta.url));
export const calendarRoot = fileURLToPath(new URL('../../../', import.meta.url));
export const routePath = resolve(calendarRoot, 'calendar-worker/worker/protectedHexa/routes.ts');

// Run exact source with installed dependencies. Only the WorkerEntrypoint
// runtime shell and explicitly supplied external I/O boundaries are replaced.
export function sourceLoader(overrides = {}) {
  const cache = new Map();
  function load(file) {
    file = file instanceof URL ? fileURLToPath(file) : file;
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const installedRequire = createRequire(file);
    const localRequire = name => {
      if (Object.hasOwn(overrides, name)) return overrides[name];
      if (name === 'cloudflare:workers') return { WorkerEntrypoint: class { constructor(_ctx, env) { this.env = env; } } };
      const base = name.startsWith('@/') ? resolve(hexaRoot, 'src', name.slice(2))
        : name.startsWith('.') ? resolve(dirname(file), name) : null;
      if (!base) return installedRequire(name);
      const target = [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]
        .find(path => existsSync(path) && statSync(path).isFile());
      if (target && /\.tsx?$/.test(target)) return load(target);
      return installedRequire(name);
    };
    const input = file === routePath && process.env.CALENDAR_TEST_ROUTE_CANDIDATE
      ? resolve(process.env.CALENDAR_TEST_ROUTE_CANDIDATE) : file;
    const { outputText } = ts.transpileModule(readFileSync(input, 'utf8'), {
      fileName: file,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    });
    let evaluate;
    try { evaluate = new Function('require', 'module', 'exports', outputText); }
    catch (error) { throw new Error(`Cannot compile offline source ${file}: ${error.message}`); }
    evaluate(localRequire, module, module.exports);
    return module.exports;
  }
  return load;
}
