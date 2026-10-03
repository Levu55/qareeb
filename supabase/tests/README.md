# Database tests

Behaviour tests for the Qareeb database: row level security, role guards, the booking state
machine, double-booking protection, wallets and the ledger, payments, reviews, chat,
notifications, admin permissions and the audit log. 18 suites, 483 checks.

Every suite runs as **one transaction that is always rolled back**, so the tests never leave
data behind, even against the live project. Test users are created inside that transaction;
no real account is read or changed.

## Run

Requirements: Node 20+ and the [Supabase CLI](https://supabase.com/docs/guides/cli) (2.x),
signed in (`supabase login`) and linked to the project (`supabase link --project-ref <ref>`).

```bash
node supabase/tests/run.mjs                 # all suites
node supabase/tests/run.mjs wallet_ledger   # suites whose file name contains "wallet_ledger"
node supabase/tests/run.mjs --verbose       # also list every passing check
node supabase/tests/run.mjs --pending       # also apply local migrations the database does not have yet
```

`--pending` applies new migration files inside each test transaction (then rolls them back),
so a migration can be tested before `supabase db push`.

Connection, in this order:

| Variable | Connects with |
| --- | --- |
| `SUPABASE_DB_URL` | `--db-url`: any Postgres that has the Qareeb schema |
| `SUPABASE_PROJECT_REF` (+ `SUPABASE_ACCESS_TOKEN`) | `--linked --project-ref`: Management API, used by CI |
| neither | `--linked`: the project linked with `supabase link` |

`SUPABASE_CLI` overrides the CLI command (default `supabase` on the PATH; on Windows a path to
`supabase.cmd` works).

The runner exits with code 1 when any check fails, when a suite cannot run, or when a suite ran
a different number of checks than its `-- @checks:` header declares.

## Writing checks

`harness.sql` is included first in every suite; `fixtures.sql` too when a suite starts with
`-- @fixtures` (C = customer, H = approved cleaning helper, A = admin, X = no account).

```sql
select pg_temp.as_user(pg_temp.c('C'));               -- act as a signed-in user (JWT claims + role)
select pg_temp.try('C sets own balance',               -- label
  'update public."Wallets" set "Balance" = 99999',     -- statement, run as the current role
  'ERR 42501: permission denied for table Wallets');   -- expected result
insert into r(test, expected, result)                  -- or compare any value directly
  select 'H wallet after', 'balance=200', 'balance=' || "Balance" from public."Wallets" where ...;
```

`try` records `OK rows=N` or `ERR <sqlstate>: <message>`. An expected value starting with `ERR `
passes when the actual error starts with it (`'ERR 23505'` accepts any unique violation); every
other expected value must match exactly. Update the `-- @checks:` count when adding checks.

Keep checks independent of real data: scope counts to the test users, or compute the expected
value inside the transaction.
