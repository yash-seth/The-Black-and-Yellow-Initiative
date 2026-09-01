-- Optional sample data for local / staging testing — NOT a migration.
-- Run it in the Supabase SQL editor after 0001–0003.
-- Safe to re-run: it deletes its own rows first (tagged submitter_token='sample-seed').
-- These pins have no photos; upload some from the UI if you want to test that.

begin;

delete from speed_breakers where submitter_token = 'sample-seed';
delete from forum_threads
  where speed_breaker_id is null
    and title = 'Painted: KPHB Road No. 1, Kukatpally';

-- Insert as 'pending' first so the approve step exercises the real trigger
-- (on_speed_breaker_status) that auto-creates each pin's discussion thread.
insert into speed_breakers (lat, lng, landmark, description, severity, status, submitter_token)
values
  (17.42390, 78.45200, 'Punjagutta junction, towards Ameerpet',
   'Tall unmarked hump right after the signal. No paint, no sign, invisible at night.', 'high', 'pending', 'sample-seed'),
  (17.44000, 78.34890, 'Gachibowli, near Biodiversity junction',
   'Sharp speed breaker on the service road. Two-wheelers bottom out here regularly.', 'high', 'pending', 'sample-seed'),
  (17.49480, 78.39960, 'KPHB Road No. 1, Kukatpally',
   'Series of three closely spaced humps, only the middle one is faintly painted.', 'medium', 'pending', 'sample-seed'),
  (17.40560, 78.55970, 'Uppal, near the ring road entrance',
   'Very steep breaker on a downhill stretch. Cars scrape; buses brake hard.', 'high', 'pending', 'sample-seed'),
  (17.39600, 78.43700, 'Mehdipatnam, near the bus stop',
   'Worn-out breaker with exposed aggregate, no markings at all.', 'medium', 'pending', 'sample-seed'),
  (17.44160, 78.49830, 'Paradise circle, Secunderabad',
   'Unmarked table-top breaker near the crossing. Faded zebra only.', 'medium', 'pending', 'sample-seed'),
  (17.34570, 78.55220, 'LB Nagar, near the metro pillar 1520',
   'Abrupt hump just past a blind curve. Reported by several auto drivers.', 'high', 'pending', 'sample-seed'),
  (17.46150, 78.36400, 'Kondapur, main road near Botanical Garden Road',
   'Low but very wide breaker, hard to see in the rain. No cat-eyes, no paint.', 'low', 'pending', 'sample-seed');

-- Approve them all -> triggers create the per-pin forum threads.
update speed_breakers set status = 'approved' where submitter_token = 'sample-seed';

-- Mark two as already painted (as if verified) so the map shows green pins.
update speed_breakers
  set paint_state = 'marked', verified_at = now()
  where submitter_token = 'sample-seed'
    and landmark in (
      'KPHB Road No. 1, Kukatpally',
      'Paradise circle, Secunderabad'
    );

-- A matching celebration thread in the Successes board for one of them.
with cat as (select id from forum_categories where slug = 'successes'),
     t as (
       insert into forum_threads (category_id, title, author_id)
       select cat.id, 'Painted: KPHB Road No. 1, Kukatpally', null from cat
       returning id
     )
insert into forum_posts (thread_id, author_id, body)
select t.id, null,
       'Great news — the humps on KPHB Road No. 1 have been repainted in black and yellow with fresh signage. Thanks to everyone who followed up.'
from t;

-- A couple of sample forum posts on the first pin's thread (author_id NULL = system).
insert into forum_posts (thread_id, author_id, body)
select t.id, null,
       'Raised this with GHMC on their complaints portal today. Ticket #DEMO-1234.'
from forum_threads t
join speed_breakers sb on sb.id = t.speed_breaker_id
where sb.submitter_token = 'sample-seed'
  and sb.landmark = 'Punjagutta junction, towards Ameerpet';

insert into forum_posts (thread_id, author_id, body)
select t.id, null,
       'Passed by this evening — still unpainted. Adding a photo from a safer angle.'
from forum_threads t
join speed_breakers sb on sb.id = t.speed_breaker_id
where sb.submitter_token = 'sample-seed'
  and sb.landmark = 'Punjagutta junction, towards Ameerpet';

commit;

-- To remove the sample data later:
--   delete from speed_breakers where submitter_token = 'sample-seed';
