-- Online payment attempts, provider callbacks, the wallet credit, and cash/online races.
-- The provider is simulated by calling the service-role functions the webhook uses.
-- @fixtures
-- @checks: 47

insert into ctx select 'b1', pg_temp.complete_job('online job', 1200);
reset role;
insert into ctx select 'p1', "ID" from public."Payments" where "Booking-id" = pg_temp.c('b1');
insert into r(test, expected, result) select 'payment created on completion', 'Due 1200', "Status" || ' ' || "Amount" from public."Payments" where "ID" = pg_temp.c('p1');

-- clients cannot reach the server-only functions
select pg_temp.as_user(pg_temp.c('C'));
select pg_temp.try('C calls start_online_payment', format('select * from public.qareeb_start_online_payment(%L, %L, %L, %L)', pg_temp.c('C'), pg_temp.c('b1'), 'JazzCash', 'testpay'), 'ERR 42501: permission denied for function qareeb_start_online_payment');
select pg_temp.try('C fakes provider success', format('select public.qareeb_record_provider_payment(gen_random_uuid(), %L, %L, 1200, %L, true)', 'testpay', 'FAKE', 'PKR'), 'ERR 42501: permission denied for function qareeb_record_provider_payment');
select pg_temp.try('C marks payment Paid', format('update public."Payments" set "Status" = %L where "ID" = %L', 'Paid', pg_temp.c('p1')), 'ERR 42501: permission denied for table Payments');
select pg_temp.try('C chooses JazzCash via RPC', format('select public.qareeb_choose_payment_method(%L, %L)', pg_temp.c('b1'), 'JazzCash'), 'ERR 42501: Online payments are not available yet. Please pay in cash.');
select pg_temp.try('C chooses Cash', format('select public.qareeb_choose_payment_method(%L, %L)', pg_temp.c('b1'), 'Cash'), 'OK rows=1');

-- server: start checkout
reset role; set local role service_role;
select pg_temp.try('svc start for stranger', format('select * from public.qareeb_start_online_payment(%L, %L, %L, %L)', pg_temp.c('X'), pg_temp.c('b1'), 'JazzCash', 'testpay'), 'ERR 42501: Payment not found');
select pg_temp.try('svc start bad method', format('select * from public.qareeb_start_online_payment(%L, %L, %L, %L)', pg_temp.c('C'), pg_temp.c('b1'), 'Bitcoin', 'testpay'), 'ERR 22023: Unknown online payment method');
select pg_temp.try('svc start JazzCash (A1)', format('select * from public.qareeb_start_online_payment(%L, %L, %L, %L)', pg_temp.c('C'), pg_temp.c('b1'), 'JazzCash', 'testpay'), 'OK rows=1');
reset role;
insert into ctx select 'a1', "ID" from public."Payment-attempts" where "Payment-id" = pg_temp.c('p1') and "Status" = 'Initiated';
insert into r(test, expected, result) select 'payment after start', 'Due JazzCash', "Status" || ' ' || "Method" from public."Payments" where "ID" = pg_temp.c('p1');

select pg_temp.as_user(pg_temp.c('H'));
select pg_temp.try('H confirms cash after switch to online', format('select public.qareeb_confirm_cash_received(%L)', pg_temp.c('b1')), 'ERR 42501: The customer has not chosen to pay in cash yet');
select pg_temp.as_user(pg_temp.c('C'));
select pg_temp.try('C switches to cash mid-checkout', format('select public.qareeb_choose_payment_method(%L, %L)', pg_temp.c('b1'), 'Cash'), 'ERR 42501: An online payment for this job is in progress');
select pg_temp.try('C reads own attempts', 'select 1 from public."Payment-attempts"', 'OK rows=1');
select pg_temp.try('C edits attempt', 'update public."Payment-attempts" set "Status" = ''Succeeded''', 'ERR 42501: permission denied for table Payment-attempts');
select pg_temp.try('C inserts attempt', format('insert into public."Payment-attempts"("Payment-id","Payer-id","Provider","Method","Amount","Currency","Expires-at","Status") values (%L,%L,%L,%L,1,%L,now(),%L)', pg_temp.c('p1'), pg_temp.c('C'), 'testpay', 'JazzCash', 'PKR', 'Succeeded'), 'ERR 42501: permission denied for table Payment-attempts');
select pg_temp.as_user(pg_temp.c('H'));
select pg_temp.try('H reads customer attempts', 'select 1 from public."Payment-attempts"', 'OK rows=0');

-- server: provider callbacks
reset role; set local role service_role;
select pg_temp.try('svc callback wrong provider', format('select public.qareeb_record_provider_payment(%L, %L, %L, 1200, %L, true)', pg_temp.c('a1'), 'otherpay', 'R1', 'PKR'), 'ERR 22023: Payment attempt belongs to another provider');
select pg_temp.try('svc callback unknown attempt', format('select public.qareeb_record_provider_payment(gen_random_uuid(), %L, %L, 1200, %L, true)', 'testpay', 'R1', 'PKR'), 'ERR P0002: Payment attempt not found');
select pg_temp.try('svc callback empty ref', format('select public.qareeb_record_provider_payment(%L, %L, %L, 1200, %L, true)', pg_temp.c('a1'), 'testpay', '', 'PKR'), 'ERR 22023: Invalid provider result');
select pg_temp.try('svc A1 declined', format('select public.qareeb_record_provider_payment(%L, %L, %L, 1200, %L, false, %L)', pg_temp.c('a1'), 'testpay', 'R1', 'PKR', 'Insufficient funds'), 'OK rows=1');
select pg_temp.try('svc A1 declined again (duplicate)', format('select public.qareeb_record_provider_payment(%L, %L, %L, 1200, %L, false)', pg_temp.c('a1'), 'testpay', 'R1', 'PKR'), 'OK rows=1');
reset role;
insert into r(test, expected, result) select 'payment after decline', 'Failed', "Status" from public."Payments" where "ID" = pg_temp.c('p1');
set local role service_role;
select pg_temp.try('svc start Easypaisa (A2)', format('select * from public.qareeb_start_online_payment(%L, %L, %L, %L)', pg_temp.c('C'), pg_temp.c('b1'), 'Easypaisa', 'testpay'), 'OK rows=1');
reset role;
insert into ctx select 'a2', "ID" from public."Payment-attempts" where "Payment-id" = pg_temp.c('p1') and "Status" = 'Initiated';
set local role service_role;
select pg_temp.try('svc A2 success, wrong amount', format('select public.qareeb_record_provider_payment(%L, %L, %L, 1, %L, true)', pg_temp.c('a2'), 'testpay', 'R2', 'PKR'), 'OK rows=1');
select pg_temp.try('svc start Card (A3)', format('select * from public.qareeb_start_online_payment(%L, %L, %L, %L)', pg_temp.c('C'), pg_temp.c('b1'), 'Card', 'testpay'), 'OK rows=1');
reset role;
insert into ctx select 'a3', "ID" from public."Payment-attempts" where "Payment-id" = pg_temp.c('p1') and "Status" = 'Initiated';
set local role service_role;
select pg_temp.try('svc start again replaces A3 (A4)', format('select * from public.qareeb_start_online_payment(%L, %L, %L, %L)', pg_temp.c('C'), pg_temp.c('b1'), 'Card', 'testpay'), 'OK rows=1');
reset role;
insert into ctx select 'a4', "ID" from public."Payment-attempts" where "Payment-id" = pg_temp.c('p1') and "Status" = 'Initiated';
set local role service_role;
select pg_temp.try('svc A4 success', format('select public.qareeb_record_provider_payment(%L, %L, %L, 1200, %L, true)', pg_temp.c('a4'), 'testpay', 'R4', 'PKR'), 'OK rows=1');
select pg_temp.try('svc A4 success duplicate', format('select public.qareeb_record_provider_payment(%L, %L, %L, 1200, %L, true)', pg_temp.c('a4'), 'testpay', 'R4', 'PKR'), 'OK rows=1');
select pg_temp.try('svc A4 late failure', format('select public.qareeb_record_provider_payment(%L, %L, %L, 1200, %L, false)', pg_temp.c('a4'), 'testpay', 'R4', 'PKR'), 'OK rows=1');
select pg_temp.try('svc A4 callback other ref', format('select public.qareeb_record_provider_payment(%L, %L, %L, 1200, %L, true)', pg_temp.c('a4'), 'testpay', 'R4-other', 'PKR'), 'ERR 22023: Provider reference does not match this payment attempt');
select pg_temp.try('svc A1 late success after paid', format('select public.qareeb_record_provider_payment(%L, %L, %L, 1200, %L, true)', pg_temp.c('a1'), 'testpay', 'R1', 'PKR'), 'OK rows=1');
select pg_temp.try('svc A3 reuses A4 provider ref', format('select public.qareeb_record_provider_payment(%L, %L, %L, 1200, %L, true)', pg_temp.c('a3'), 'testpay', 'R4', 'PKR'), 'ERR 23505');
select pg_temp.try('svc start after paid', format('select * from public.qareeb_start_online_payment(%L, %L, %L, %L)', pg_temp.c('C'), pg_temp.c('b1'), 'Card', 'testpay'), 'ERR 42501: This payment is already paid');
reset role;
insert into r(test, expected, result) select 'payment final', 'Paid Card testpay R4 paid_at=true', "Status" || ' ' || "Method" || ' ' || "Provider" || ' ' || "Provider-ref" || ' paid_at=' || ("Paid-at" is not null) from public."Payments" where "ID" = pg_temp.c('p1');
insert into r(test, expected, result) select 'attempts',
  'Card:Failed (Replaced by a new payment attempt); Card:Succeeded; Easypaisa:Needs-review (Provider reported 1 PKR, expected 1200 PKR); JazzCash:Needs-review (The job was already paid; refund this provider payment)',
  string_agg("Method" || ':' || "Status" || coalesce(' (' || "Note" || ')', ''), '; ' order by "Method", "Status") from public."Payment-attempts" where "Payment-id" = pg_temp.c('p1');
insert into r(test, expected, result) select 'H ledger for payment', '1 entries, Earning 1200 Completed after=1200', count(*) || ' entries, ' || coalesce(string_agg("Type" || ' ' || "Amount" || ' ' || "Status" || ' after=' || "Balance-after", '; '), '') from public."Transactions" where "Payment-id" = pg_temp.c('p1');
insert into r(test, expected, result) select 'H wallet balance', '1200', "Balance"::text from public."Wallets" where "ID" = pg_temp.c('HW');
insert into r(test, expected, result) select 'admin log needs_review', '2', count(*)::text from public."Admin-logs" where "Action" = 'payment.needs_review' and "Created-at" >= now();
insert into r(test, expected, result) select 'notifications for job',
  'payment_cash_pending->H, payment_confirmed->C, payment_failed->C, payment_received->H, payment_review->C, payment_review->C',
  string_agg("Type" || '->' || case when "User-id" = pg_temp.c('C') then 'C' else 'H' end, ', ' order by "Created-at", "Type") from public."Notifications" where "Booking-id" = pg_temp.c('b1') and "Type" like 'payment%';

-- cash job: no wallet movement; expired online attempt does not block cash
insert into ctx select 'b2', pg_temp.complete_job('cash job', 800);
reset role;
set local role service_role;
select pg_temp.try('svc start online for cash job', format('select * from public.qareeb_start_online_payment(%L, %L, %L, %L)', pg_temp.c('C'), pg_temp.c('b2'), 'JazzCash', 'testpay'), 'OK rows=1');
reset role;
update public."Payment-attempts" set "Expires-at" = now() - interval '1 minute' where "Payment-id" = (select "ID" from public."Payments" where "Booking-id" = pg_temp.c('b2'));
select pg_temp.as_user(pg_temp.c('C'));
select pg_temp.try('C chooses cash after attempt expired', format('select public.qareeb_choose_payment_method(%L, %L)', pg_temp.c('b2'), 'Cash'), 'OK rows=1');
select pg_temp.as_user(pg_temp.c('H'));
select pg_temp.try('H confirms cash', format('select public.qareeb_confirm_cash_received(%L)', pg_temp.c('b2')), 'OK rows=1');
reset role;
insert into r(test, expected, result) select 'cash job payment', 'Paid Cash', "Status" || ' ' || "Method" from public."Payments" where "Booking-id" = pg_temp.c('b2');
insert into r(test, expected, result) select 'cash job ledger entries', '0', count(*)::text from public."Transactions" where "Booking-id" = pg_temp.c('b2');
insert into r(test, expected, result) select 'H wallet balance after cash', '1200', "Balance"::text from public."Wallets" where "ID" = pg_temp.c('HW');
select pg_temp.as_user(pg_temp.c('A'));
-- scoped to the test customer so the count does not depend on real data
select pg_temp.try('A reads all attempts', format('select 1 from public."Payment-attempts" where "Payer-id" = %L', pg_temp.c('C')), 'OK rows=5');
select pg_temp.try('A wallet mismatches', 'select * from public.qareeb_admin_wallet_mismatches()', 'OK rows=0');
reset role;
