-- Optional fictional seed. Run once in the SQL Editor after the migration
-- and after at least one real user has signed up.
-- It does not create auth users. If no profile exists yet, it inserts nothing.
-- Running it again does not duplicate the fictional rows.

insert into public.leads (
  id,
  full_name,
  email,
  phone,
  course_interest,
  source,
  status,
  assigned_to,
  created_by,
  notes
)
select
  seed.id,
  seed.full_name,
  seed.email,
  seed.phone,
  seed.course_interest,
  seed.source,
  seed.status,
  owner.id,
  owner.id,
  seed.notes
from (
  values
    (
      '10000000-0000-4000-8000-000000000001'::uuid,
      'Riya Shah',
      'riya.shah.demo@example.com',
      '9800000001',
      'Class 10 foundation',
      'website',
      'New',
      'Fictional demo enquiry. Not a real student.'
    ),
    (
      '10000000-0000-4000-8000-000000000002'::uuid,
      'Arjun Mehta',
      'arjun.mehta.demo@example.com',
      '9800000002',
      'JEE preparation',
      'referral',
      'Contacted',
      'Fictional demo enquiry. Not a real student.'
    ),
    (
      '10000000-0000-4000-8000-000000000003'::uuid,
      'Neelam Iyer',
      null,
      '9800000003',
      'NEET preparation',
      'walk-in',
      'Qualified',
      'Fictional demo enquiry. Not a real student.'
    )
) as seed (
  id,
  full_name,
  email,
  phone,
  course_interest,
  source,
  status,
  notes
)
cross join (
  select id
  from public.profiles
  order by created_at
  limit 1
) as owner
on conflict (id) do nothing;

insert into public.follow_ups (
  id,
  lead_id,
  assigned_to,
  due_at,
  note,
  status,
  created_by
)
select
  '10000000-0000-4000-8000-000000000011'::uuid,
  '10000000-0000-4000-8000-000000000001'::uuid,
  leads.created_by,
  now() + interval '1 day',
  'Fictional demo follow-up. Call the family about the foundation batch.',
  'pending',
  leads.created_by
from public.leads
where leads.id = '10000000-0000-4000-8000-000000000001'::uuid
on conflict (id) do nothing;

insert into public.activities (
  id,
  lead_id,
  actor_id,
  activity_type,
  description
)
select
  '10000000-0000-4000-8000-000000000021'::uuid,
  leads.id,
  leads.created_by,
  'lead_created',
  'Fictional demo activity. Enquiry recorded from the website.'
from public.leads
where leads.id = '10000000-0000-4000-8000-000000000001'::uuid
on conflict (id) do nothing;
