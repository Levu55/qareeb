#!/usr/bin/env node
// Runs the database test suites in supabase/tests against a Supabase database.
//
//   node supabase/tests/run.mjs                 all *.test.sql files
//   node supabase/tests/run.mjs wallet_ledger   only files whose name contains "wallet_ledger"
//   node supabase/tests/run.mjs --verbose       also print every passing check
//   node supabase/tests/run.mjs --pending       first apply local migrations the database does not
//                                               have yet (inside the same rolled-back transaction)
//
// Each file runs as ONE transaction that is always rolled back:
//   begin; [pending migrations]; harness.sql; [fixtures.sql]; <file>; <collect results>; rollback;
// so the suites never change data, even when they run against a live project.
//
// Connection (Supabase CLI `db query`):
//   SUPABASE_DB_URL set      -> --db-url "$SUPABASE_DB_URL"   (any Postgres with the Qareeb schema)
//   SUPABASE_PROJECT_REF set -> --linked --project-ref <ref>  (Management API; needs SUPABASE_ACCESS_TOKEN)
//   otherwise                -> --linked                      (project linked with `supabase link`)
// SUPABASE_CLI overrides the CLI command (default: `supabase` on PATH).

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const withPending = args.includes('--pending');
const filters = args.filter(a => !a.startsWith('--'));

const files = readdirSync(dir)
  .filter(f => f.endsWith('.test.sql'))
  .filter(f => filters.length === 0 || filters.some(x => f.includes(x)))
  .sort();
if (files.length === 0) {
  console.error('No test files matched.');
  process.exit(2);
}

const harness = readFileSync(join(dir, 'harness.sql'), 'utf8');
const fixtures = readFileSync(join(dir, 'fixtures.sql'), 'utf8');
const collect = `
reset role;
select n, test, coalesce(expected, '(no expectation)') as expected, coalesce(result, '(null)') as result,
  case when expected is null or result is null then false
       when expected like 'ERR %' then starts_with(result, expected)
       else result = expected end as passed
from r order by n;
rollback;
`;

function connectionArgs() {
  if (process.env.SUPABASE_DB_URL) return ['--db-url', process.env.SUPABASE_DB_URL];
  if (process.env.SUPABASE_PROJECT_REF) return ['--linked', '--project-ref', process.env.SUPABASE_PROJECT_REF];
  return ['--linked'];
}

// The CLI prints the result as one JSON object; anything around it (progress lines) is ignored.
function parseJson(text) {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0, inString = false, escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) {
      try { return JSON.parse(text.slice(start, i + 1)); } catch { return null; }
    }
  }
  return null;
}

function runSql(sqlFile) {
  const cli = process.env.SUPABASE_CLI || 'supabase';
  const cliArgs = ['db', 'query', ...connectionArgs(), '--output-format', 'json', '-f', sqlFile];
  const onWindows = process.platform === 'win32';
  const quote = a => (/[\s"&|<>^]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
  const res = spawnSync(onWindows ? quote(cli) : cli, onWindows ? cliArgs.map(quote) : cliArgs, {
    cwd: join(dir, '..', '..'),
    encoding: 'utf8',
    shell: onWindows,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (res.error) return { error: `could not start ${cli}: ${res.error.message}` };
  const json = parseJson(res.stdout || '');
  if (res.status !== 0 || !json || json.error || !Array.isArray(json.rows)) {
    const detail = json?.error?.message || (res.stderr || res.stdout || '').trim().split('\n').slice(-3).join(' ');
    return { error: detail || `exit code ${res.status}` };
  }
  return { rows: json.rows };
}

const tmp = mkdtempSync(join(tmpdir(), 'qareeb-db-tests-'));
let total = 0, passed = 0, failed = 0, brokenFiles = 0;

// Local migrations whose version is not in the database's migration history yet
function pendingMigrations() {
  const versionsFile = join(tmp, 'versions.sql');
  writeFileSync(versionsFile, 'select version from supabase_migrations.schema_migrations order by version;\n');
  const out = runSql(versionsFile);
  if (out.error) throw new Error(`could not read the migration history: ${out.error}`);
  const applied = new Set(out.rows.map(r => String(r.version)));
  const migrationsDir = join(dir, '..', 'migrations');
  return readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql') && !applied.has(f.split('_')[0]))
    .sort()
    .map(f => ({ name: f, sql: readFileSync(join(migrationsDir, f), 'utf8') }));
}

try {
  const pending = withPending ? pendingMigrations() : [];
  if (withPending) {
    console.log(pending.length ? `Applying ${pending.length} pending migration(s) inside each test transaction:` : 'No pending migrations.');
    for (const m of pending) console.log(`  ${m.name}`);
  }
  const prelude = pending.map(m => `-- pending migration ${m.name}\n${m.sql}`).join('\n');

  for (const file of files) {
    const body = readFileSync(join(dir, file), 'utf8');
    const useFixtures = /^--\s*@fixtures\b/m.test(body);
    const declared = Number((body.match(/^--\s*@checks:\s*(\d+)/m) || [])[1] || NaN);
    const sql = ['begin;', prelude, harness, useFixtures ? fixtures : '', body, collect].join('\n');
    const sqlFile = join(tmp, basename(file));
    writeFileSync(sqlFile, sql);

    const out = runSql(sqlFile);
    if (out.error) {
      brokenFiles++;
      console.log(`\nFAIL ${file}: the suite did not run (${out.error})`);
      continue;
    }
    const rows = out.rows;
    const bad = rows.filter(r => r.passed !== true);
    const countOk = Number.isNaN(declared) || declared === rows.length;
    total += rows.length;
    passed += rows.length - bad.length;
    failed += bad.length;
    console.log(`\n${bad.length === 0 && countOk ? 'PASS' : 'FAIL'} ${file}: ${rows.length - bad.length}/${rows.length} checks passed`);
    if (!countOk) {
      brokenFiles++;
      console.log(`  expected ${declared} checks but ${rows.length} ran (a check was skipped or added)`);
    }
    for (const r of rows) {
      if (r.passed !== true) {
        console.log(`  x #${r.n} ${r.test}\n      expected: ${r.expected}\n      actual:   ${r.result}`);
      } else if (verbose) {
        console.log(`  ok #${r.n} ${r.test}: ${r.result}`);
      }
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(`\n${files.length} suites, ${total} checks: ${passed} passed, ${failed} failed` +
  (brokenFiles ? `, ${brokenFiles} suite problem(s)` : ''));
process.exit(failed === 0 && brokenFiles === 0 ? 0 : 1);
