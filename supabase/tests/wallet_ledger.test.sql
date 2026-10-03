-- Wallet ledger: balances only move through append-only Transactions, for every role.
-- @fixtures
-- @checks: 45

-- client access
select pg_temp.as_user(pg_temp.c('C'));
select pg_temp.try('C reads own wallet', 'select 1 from public."Wallets"', 'OK rows=1');
select pg_temp.try('C reads H wallet', format('select 1 from public."Wallets" where "User-id" = %L', pg_temp.c('H')), 'OK rows=0');
select pg_temp.try('C sets own balance', 'update public."Wallets" set "Balance" = 99999', 'ERR 42501: permission denied for table Wallets');
select pg_temp.try('C inserts wallet', format('insert into public."Wallets"("User-id","Balance") values (%L, 5000)', pg_temp.c('C')), 'ERR 42501: permission denied for table Wallets');
select pg_temp.try('C deletes wallet', 'delete from public."Wallets"', 'ERR 42501: permission denied for table Wallets');
select pg_temp.try('C inserts Completed earning', format('insert into public."Transactions"("User-id","Type","Amount","Status","Idempotency-key") values (%L,%L,5000,%L,%L)', pg_temp.c('C'), 'Earning', 'Completed', 'fake-1'), 'ERR 42501: permission denied for table Transactions');
select pg_temp.try('C calls mismatch fn', 'select * from public.qareeb_admin_wallet_mismatches()', 'ERR 42501: Admins only');

-- server writes
reset role; set local role service_role;
select pg_temp.try('svc sets balance directly', format('update public."Wallets" set "Balance" = 1000 where "ID" = %L', pg_temp.c('HW')), 'ERR 42501: Wallet balance can only change through wallet transactions');
select pg_temp.try('svc creates wallet with balance (new user)', format('insert into public."Wallets"("User-id","Balance") values (%L, 50) on conflict ("User-id") do update set "Balance" = 50', pg_temp.c('C')), 'ERR 42501: Wallet balance can only change through wallet transactions');
select pg_temp.try('svc earning +500', format('insert into public."Transactions"("User-id","Type","Amount","Status","Idempotency-key") values (%L,%L,500,%L,%L)', pg_temp.c('H'), 'Earning', 'Completed', 'test:e1'), 'OK rows=1');
select pg_temp.try('svc duplicate key', format('insert into public."Transactions"("User-id","Type","Amount","Status","Idempotency-key") values (%L,%L,500,%L,%L)', pg_temp.c('H'), 'Earning', 'Completed', 'test:e1'), 'ERR 23505');
select pg_temp.try('svc duplicate key on conflict', format('insert into public."Transactions"("User-id","Type","Amount","Status","Idempotency-key") values (%L,%L,500,%L,%L) on conflict ("Idempotency-key") do nothing', pg_temp.c('H'), 'Earning', 'Completed', 'test:e1'), 'OK rows=0');
select pg_temp.try('svc overdraw payout -600', format('insert into public."Transactions"("User-id","Type","Amount","Status","Idempotency-key") values (%L,%L,-600,%L,%L)', pg_temp.c('H'), 'Payout', 'Completed', 'test:p1'), 'ERR 23514: Insufficient wallet balance');
select pg_temp.try('svc payout -200', format('insert into public."Transactions"("User-id","Type","Amount","Status","Idempotency-key") values (%L,%L,-200,%L,%L)', pg_temp.c('H'), 'Payout', 'Completed', 'test:p2'), 'OK rows=1');
select pg_temp.try('svc negative earning', format('insert into public."Transactions"("User-id","Type","Amount","Status","Idempotency-key") values (%L,%L,-5,%L,%L)', pg_temp.c('H'), 'Earning', 'Completed', 'test:bad1'), 'ERR 23514');
select pg_temp.try('svc unknown type', format('insert into public."Transactions"("User-id","Type","Amount","Status","Idempotency-key") values (%L,%L,5,%L,%L)', pg_temp.c('H'), 'Bonus', 'Completed', 'test:bad2'), 'ERR 23514');
select pg_temp.try('svc null type', format('insert into public."Transactions"("User-id","Amount","Status","Idempotency-key") values (%L,5,%L,%L)', pg_temp.c('H'), 'Completed', 'test:bad3'), 'ERR 23502');
select pg_temp.try('svc zero adjustment', format('insert into public."Transactions"("User-id","Type","Amount","Status","Idempotency-key") values (%L,%L,0,%L,%L)', pg_temp.c('H'), 'Adjustment', 'Completed', 'test:bad4'), 'ERR 23514');
select pg_temp.try('svc no idempotency key', format('insert into public."Transactions"("User-id","Type","Amount","Status") values (%L,%L,5,%L)', pg_temp.c('H'), 'Earning', 'Completed'), 'ERR 23502');
select pg_temp.try('svc wallet of other user', format('insert into public."Transactions"("Wallet-id","User-id","Type","Amount","Status","Idempotency-key") values (%L,%L,%L,5,%L,%L)', pg_temp.c('CW'), pg_temp.c('H'), 'Earning', 'Pending', 'test:bad5'), 'ERR 23503');
select pg_temp.try('svc insert Failed', format('insert into public."Transactions"("User-id","Type","Amount","Status","Idempotency-key") values (%L,%L,5,%L,%L)', pg_temp.c('H'), 'Earning', 'Failed', 'test:bad6'), 'ERR 23514: A new wallet transaction must be Pending or Completed');
select pg_temp.try('svc pending with fake balance-after', format('insert into public."Transactions"("User-id","Type","Amount","Status","Idempotency-key","Balance-after") values (%L,%L,5,%L,%L,99999)', pg_temp.c('H'), 'Adjustment', 'Pending', 'test:pend0'), 'OK rows=1');
select pg_temp.try('svc edit completed amount', 'update public."Transactions" set "Amount" = 50000 where "Idempotency-key" = ''test:e1''', 'ERR 42501: Completed or failed wallet transactions cannot be changed');
select pg_temp.try('svc completed -> failed', 'update public."Transactions" set "Status" = ''Failed'' where "Idempotency-key" = ''test:e1''', 'ERR 42501: Completed or failed wallet transactions cannot be changed');
select pg_temp.try('svc delete transaction', 'delete from public."Transactions" where "Idempotency-key" = ''test:e1''', 'ERR 42501: Wallet transactions cannot be deleted');
select pg_temp.try('svc truncate transactions', 'truncate public."Transactions"', 'ERR 42501: Wallet transactions cannot be deleted');
select pg_temp.try('svc pending payout -100', format('insert into public."Transactions"("User-id","Type","Amount","Status","Idempotency-key") values (%L,%L,-100,%L,%L)', pg_temp.c('H'), 'Payout', 'Pending', 'test:p3'), 'OK rows=1');
select pg_temp.try('svc complete pending + change amount', 'update public."Transactions" set "Status" = ''Completed'', "Amount" = -1 where "Idempotency-key" = ''test:p3''', 'ERR 42501: A pending wallet transaction can only be completed or failed');
select pg_temp.try('svc complete pending payout', 'update public."Transactions" set "Status" = ''Completed'' where "Idempotency-key" = ''test:p3''', 'OK rows=1');
select pg_temp.try('svc re-complete', 'update public."Transactions" set "Status" = ''Completed'' where "Idempotency-key" = ''test:p3''', 'ERR 42501: Completed or failed wallet transactions cannot be changed');
select pg_temp.try('svc fail pending adjustment', 'update public."Transactions" set "Status" = ''Failed'' where "Idempotency-key" = ''test:pend0''', 'OK rows=1');
select pg_temp.try('svc balance = ledger sum (no-op)', format('update public."Wallets" set "Balance" = 200 where "ID" = %L', pg_temp.c('HW')), 'OK rows=1');
select pg_temp.try('svc multi-row same wallet', format('insert into public."Transactions"("User-id","Type","Amount","Status","Idempotency-key") values (%L,%L,1,%L,%L),(%L,%L,1,%L,%L)', pg_temp.c('H'), 'Adjustment', 'Completed', 'test:m1', pg_temp.c('H'), 'Adjustment', 'Completed', 'test:m2'), 'ERR 42501: Wallet balance can only change through wallet transactions');
select pg_temp.try('svc change wallet owner', format('update public."Wallets" set "User-id" = %L where "ID" = %L', pg_temp.c('C'), pg_temp.c('HW')), 'ERR 42501: Wallet owner, currency and creation time cannot be changed');
reset role;
insert into r(test, expected, result) select 'C wallet after', 'balance=0', 'balance=' || "Balance" from public."Wallets" where "ID" = pg_temp.c('CW');
insert into r(test, expected, result) select 'H wallet after', 'balance=200', 'balance=' || "Balance" from public."Wallets" where "ID" = pg_temp.c('HW');
insert into r(test, expected, result) select 'H ledger', 'Earning 500 Completed after=500; Payout -200 Completed after=300; Payout -100 Completed after=200; Adjustment 5 Failed after=-',
  string_agg("Type" || ' ' || "Amount" || ' ' || "Status" || ' after=' || coalesce("Balance-after"::text, '-'), '; ' order by "Created-at", "Idempotency-key") from public."Transactions" where "User-id" = pg_temp.c('H');

-- client reads of ledger
select pg_temp.as_user(pg_temp.c('H'));
select pg_temp.try('H reads own transactions', 'select 1 from public."Transactions"', 'OK rows=4');
select pg_temp.try('H edits own transaction', 'update public."Transactions" set "Amount" = 1', 'ERR 42501: permission denied for table Transactions');
select pg_temp.try('H deletes own transaction', 'delete from public."Transactions"', 'ERR 42501: permission denied for table Transactions');
select pg_temp.as_user(pg_temp.c('C'));
select pg_temp.try('C reads H transactions', format('select 1 from public."Transactions" where "User-id" = %L', pg_temp.c('H')), 'OK rows=0');
select pg_temp.as_user(pg_temp.c('A'));
-- scoped to the test users so the count does not depend on real data
select pg_temp.try('A reads all transactions', format('select 1 from public."Transactions" where "User-id" in (%L, %L)', pg_temp.c('C'), pg_temp.c('H')), 'OK rows=4');
select pg_temp.try('A edits transaction', 'update public."Transactions" set "Amount" = 1', 'ERR 42501: permission denied for table Transactions');
select pg_temp.try('A sets wallet balance', 'update public."Wallets" set "Balance" = 1', 'ERR 42501: permission denied for table Wallets');
select pg_temp.try('A mismatch fn', 'select * from public.qareeb_admin_wallet_mismatches()', 'OK rows=0');
reset role;
