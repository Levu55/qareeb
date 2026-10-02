-- Qareeb: notifications that were missing for payments and admin cancellations.
--
-- - Online payment confirmed: the helper is told the money was credited to their wallet
--   (cash is confirmed by the helper, so they already know).
-- - Online payment failed: the customer is told to try again or pay in cash.
-- - Provider took money that could not be applied (Payment-attempts "Needs-review"):
--   the customer is told the team will sort it out (admins see it in the audit log).
-- - A booking cancelled by someone other than the customer (an admin) now notifies the
--   customer as well as the helper, and does not claim the customer cancelled it.
-- CNIC approval/rejection/revocation notifications are written by the review-cnic Edge
-- Function, because those decisions live in auth metadata rather than in a table.

create or replace function public.qareeb_notify_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new."Status" is not distinct from old."Status" then
    return null;
  end if;
  if new."Status" = 'Awaiting-confirmation' then
    perform public.qareeb_notify(new."Payee-id", 'payment_cash_pending', 'Cash payment to confirm',
      'The customer will pay Rs. ' || new."Amount" || ' in cash. Confirm it in your Wallet once received.', new."Booking-id");
  elsif new."Status" = 'Paid' then
    perform public.qareeb_notify(new."Payer-id", 'payment_confirmed', 'Payment confirmed',
      'Your payment of Rs. ' || new."Amount" || ' was confirmed.', new."Booking-id");
    if new."Method" is distinct from 'Cash' then
      perform public.qareeb_notify(new."Payee-id", 'payment_received', 'Payment received',
        'Rs. ' || new."Amount" || ' was paid online and added to your wallet.', new."Booking-id");
    end if;
  elsif new."Status" = 'Failed' then
    perform public.qareeb_notify(new."Payer-id", 'payment_failed', 'Payment failed',
      'Your online payment of Rs. ' || new."Amount" || ' did not go through. Please try again or pay in cash.', new."Booking-id");
  end if;
  return null;
end;
$$;

create or replace function public.qareeb_notify_payment_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking uuid;
begin
  if new."Status" = 'Needs-review' and old."Status" is distinct from 'Needs-review' then
    select "Booking-id" into booking from public."Payments" where "ID" = new."Payment-id";
    -- The reported amount may differ from the amount due, so none is quoted
    perform public.qareeb_notify(new."Payer-id", 'payment_review', 'Payment under review',
      'Your ' || new."Method" || ' payment for this job could not be applied automatically. '
        || 'Our team will check it and refund you if needed.', booking);
  end if;
  return null;
end;
$$;

create trigger qareeb_notify_payment_review
  after update on public."Payment-attempts"
  for each row execute function public.qareeb_notify_payment_review();

create or replace function public.qareeb_notify_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  task_title text;
  helper_name text;
  customer_name text;
begin
  if tg_op = 'UPDATE' and new."Status" is not distinct from old."Status" then
    return null;
  end if;

  select coalesce(nullif("Title", ''), 'your task') into task_title from public."Tasks" where "ID" = new."Task-id";
  select coalesce(nullif("Full-name", ''), 'Your helper') into helper_name from public."Profiles" where "ID" = new."Helper-id";
  select coalesce(nullif("Full-name", ''), 'The customer') into customer_name from public."Profiles" where "ID" = new."User-id";

  if tg_op = 'INSERT' then
    perform public.qareeb_notify(new."Helper-id", 'booking_request', 'New booking request',
      customer_name || ' requested you for "' || task_title || '".', new."ID");
    return null;
  end if;

  case new."Status"
    when 'Accepted' then
      perform public.qareeb_notify(new."User-id", 'booking_accepted', 'Booking accepted',
        helper_name || ' accepted "' || task_title || '".', new."ID");
    when 'Rejected' then
      perform public.qareeb_notify(new."User-id", 'booking_rejected', 'Request declined',
        helper_name || ' declined "' || task_title || '". You can choose another helper.', new."ID");
    when 'On-the-way' then
      perform public.qareeb_notify(new."User-id", 'booking_on_the_way', 'Helper on the way',
        helper_name || ' is on the way.', new."ID");
    when 'Arrived' then
      perform public.qareeb_notify(new."User-id", 'booking_arrived', 'Helper arrived',
        helper_name || ' has arrived.', new."ID");
    when 'In-progress' then
      perform public.qareeb_notify(new."User-id", 'booking_in_progress', 'Work started',
        helper_name || ' started working on "' || task_title || '".', new."ID");
    when 'Completed' then
      perform public.qareeb_notify(new."User-id", 'booking_completed', 'Job completed',
        '"' || task_title || '" is done. Please pay and rate ' || helper_name || '.', new."ID");
    when 'Cancelled' then
      if auth.uid() is not distinct from new."User-id" then
        perform public.qareeb_notify(new."Helper-id", 'booking_cancelled', 'Booking cancelled',
          customer_name || ' cancelled "' || task_title || '".', new."ID");
      else
        perform public.qareeb_notify(new."Helper-id", 'booking_cancelled', 'Booking cancelled',
          '"' || task_title || '" was cancelled by Qareeb support.', new."ID");
        perform public.qareeb_notify(new."User-id", 'booking_cancelled', 'Booking cancelled',
          'Your booking for "' || task_title || '" was cancelled by Qareeb support.', new."ID");
      end if;
    else
      null;
  end case;
  return null;
end;
$$;

revoke all on function public.qareeb_notify_payment() from public, anon, authenticated;
revoke all on function public.qareeb_notify_payment_review() from public, anon, authenticated;
revoke all on function public.qareeb_notify_booking() from public, anon, authenticated;
