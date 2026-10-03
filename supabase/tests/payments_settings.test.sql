-- Payments and Settings: a payment row per completed booking, cash chosen by the customer and
-- confirmed by the helper, no direct writes, the digital-payment threshold, and the
-- service-role provider path.
-- @fixtures
-- @checks: 24

-- known cash limit for this test, whatever the live setting is
update public."Settings" set "Value" = '1500' where "Key" = 'digital_payment_threshold';

-- the original suite used a real completed Rs 1000 booking; this one is completed here
insert into ctx select 'b1', pg_temp.complete_job('pay1000', 1000);
reset role;
insert into r(test, expected, result) select 'payment created on completion', 'Due 1000 payer_ok=true payee_ok=true', "Status" || ' ' || "Amount" || ' payer_ok=' || ("Payer-id" = pg_temp.c('C')) || ' payee_ok=' || ("Payee-id" = pg_temp.c('H')) from public."Payments" where "Booking-id" = pg_temp.c('b1');

-- stranger / helper / customer direct writes
select pg_temp.as_user(pg_temp.c('X'));
select pg_temp.try('stranger reads payment', format('select 1 from public."Payments" where "Booking-id" = %L', pg_temp.c('b1')), 'OK rows=0');
select pg_temp.try('stranger chooses cash', format('select public.qareeb_choose_payment_method(%L, %L)', pg_temp.c('b1'), 'Cash'), 'ERR 42501: Payment not found');
select pg_temp.as_user(pg_temp.c('C'));
select pg_temp.try('customer reads own payment', format('select 1 from public."Payments" where "Booking-id" = %L', pg_temp.c('b1')), 'OK rows=1');
select pg_temp.try('customer marks Paid directly', format('update public."Payments" set "Status" = ''Paid'' where "Booking-id" = %L', pg_temp.c('b1')), 'ERR 42501: permission denied for table Payments');
select pg_temp.try('customer inserts payment', format('insert into public."Payments"("Booking-id","Payer-id","Payee-id","Amount","Status") values (%L,%L,%L,1,''Paid'')', pg_temp.c('b1'), pg_temp.c('C'), pg_temp.c('H')), 'ERR 42501: permission denied for table Payments');
-- current provider function signature (attempt-based since 2026-10-02)
select pg_temp.try('customer calls provider function', format('select public.qareeb_record_provider_payment(gen_random_uuid(), %L, %L, 1000, %L, true)', 'testpay', 'ref1', 'PKR'), 'ERR 42501: permission denied for function qareeb_record_provider_payment');
select pg_temp.try('customer chooses JazzCash', format('select public.qareeb_choose_payment_method(%L, %L)', pg_temp.c('b1'), 'JazzCash'), 'ERR 42501: Online payments are not available yet. Please pay in cash.');
select pg_temp.try('customer confirms own cash', format('select public.qareeb_confirm_cash_received(%L)', pg_temp.c('b1')), 'ERR 42501: Payment not found');
select pg_temp.as_user(pg_temp.c('H'));
select pg_temp.try('helper confirms before customer chose', format('select public.qareeb_confirm_cash_received(%L)', pg_temp.c('b1')), 'ERR 42501: The customer has not chosen to pay in cash yet');
select pg_temp.try('helper chooses method for customer', format('select public.qareeb_choose_payment_method(%L, %L)', pg_temp.c('b1'), 'Cash'), 'ERR 42501: Payment not found');
select pg_temp.as_user(pg_temp.c('C'));
select pg_temp.try('customer chooses Cash', format('select public.qareeb_choose_payment_method(%L, %L)', pg_temp.c('b1'), 'Cash'), 'OK rows=1');
select pg_temp.as_user(pg_temp.c('H'));
select pg_temp.try('helper confirms cash', format('select public.qareeb_confirm_cash_received(%L)', pg_temp.c('b1')), 'OK rows=1');
reset role;
insert into r(test, expected, result) select 'payment after', 'Paid Cash paid_at=true', "Status" || ' ' || coalesce("Method",'-') || ' paid_at=' || ("Paid-at" is not null) from public."Payments" where "Booking-id" = pg_temp.c('b1');

-- Rs 2000 job: cash above the threshold
insert into ctx select 'b2', pg_temp.complete_job('pay2000', 2000);
reset role;
insert into r(test, expected, result) select 'auto payment on completion', 'Due 2000', "Status" || ' ' || "Amount" from public."Payments" where "Booking-id" = pg_temp.c('b2');
select pg_temp.as_user(pg_temp.c('C'));
select pg_temp.try('cash above threshold', format('select public.qareeb_choose_payment_method(%L, %L)', pg_temp.c('b2'), 'Cash'), 'ERR 42501: Cash is accepted up to Rs. 1500. This job needs online payment, which is not available yet.');
-- settings
select pg_temp.try('customer reads settings', 'select 1 from public."Settings" where "Key" = ''digital_payment_threshold''', 'OK rows=1');
select pg_temp.try('customer changes threshold', 'update public."Settings" set "Value" = ''999999'' where "Key" = ''digital_payment_threshold''', 'OK rows=0');
select pg_temp.as_user(pg_temp.c('A'));
select pg_temp.try('admin changes threshold', 'update public."Settings" set "Value" = ''2500'' where "Key" = ''digital_payment_threshold''', 'OK rows=1');
reset role;
insert into r(test, expected, result) select 'setting after', '2500 by_admin=true', "Value"::text || ' by_admin=' || ("Updated-by" = pg_temp.c('A')) from public."Settings" where "Key" = 'digital_payment_threshold';
-- provider path as service_role, idempotent (current attempt-based functions)
set local role service_role;
select * from public.qareeb_start_online_payment(pg_temp.c('C'), pg_temp.c('b2'), 'JazzCash', 'testpay');
reset role;
insert into ctx select 'a2', "ID" from public."Payment-attempts" where "Payment-id" = (select "ID" from public."Payments" where "Booking-id" = pg_temp.c('b2'));
set local role service_role;
select pg_temp.try('provider amount mismatch', format('select public.qareeb_record_provider_payment(%L, %L, %L, 1, %L, true)', pg_temp.c('a2'), 'testpay', 'REF-1', 'PKR'), 'OK rows=1');
select * from public.qareeb_start_online_payment(pg_temp.c('C'), pg_temp.c('b2'), 'JazzCash', 'testpay');
reset role;
insert into ctx select 'a3', "ID" from public."Payment-attempts" where "Payment-id" = (select "ID" from public."Payments" where "Booking-id" = pg_temp.c('b2')) and "Status" = 'Initiated';
set local role service_role;
select pg_temp.try('provider success', format('select public.qareeb_record_provider_payment(%L, %L, %L, 2000, %L, true)', pg_temp.c('a3'), 'testpay', 'REF-2', 'PKR'), 'OK rows=1');
select pg_temp.try('provider duplicate webhook', format('select public.qareeb_record_provider_payment(%L, %L, %L, 2000, %L, true)', pg_temp.c('a3'), 'testpay', 'REF-2', 'PKR'), 'OK rows=1');
reset role;
insert into r(test, expected, result) select 'provider payment after', 'Paid JazzCash REF-2', "Status" || ' ' || "Method" || ' ' || "Provider-ref" from public."Payments" where "Booking-id" = pg_temp.c('b2');
