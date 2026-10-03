-- Qareeb: deliver booking status changes through Supabase Realtime.
--
-- Realtime applies the table's RLS SELECT policy to each subscriber, so a change is
-- only delivered to the booking's customer, its helper and admins. Only "Bookings"
-- is published: helper coordinates stay in "Helpers" (not published), and customers
-- keep receiving a distance/ETA from qareeb_my_bookings, never raw coordinates.

alter publication supabase_realtime add table public."Bookings";
