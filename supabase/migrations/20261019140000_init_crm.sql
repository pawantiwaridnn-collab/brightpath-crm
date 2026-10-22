-- BrightPath CRM schema, constraints, and row level security.
-- Apply once in the Supabase SQL Editor. Do not put keys or passwords in this file.
--
-- After the project owner signs up, promote that profile from the SQL Editor:
--   update public.profiles
--   set role = 'admin'
--   where id = '<user-uuid>';
-- The SQL Editor runs without auth.uid(), so that role change is allowed.
-- A signed-in client cannot change role.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null default 'counsellor',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_not_blank check (char_length(btrim(full_name)) > 0),
  constraint profiles_role_valid check (role in ('admin', 'manager', 'counsellor'))
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text not null,
  course_interest text not null,
  source text not null,
  status text not null default 'New',
  lost_reason text,
  assigned_to uuid references public.profiles (id) on delete set null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_full_name_not_blank check (char_length(btrim(full_name)) > 0),
  constraint leads_phone_not_blank check (char_length(btrim(phone)) > 0),
  constraint leads_course_not_blank check (char_length(btrim(course_interest)) > 0),
  constraint leads_email_format check (
    email is null
    or email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  constraint leads_source_valid check (
    source in ('website', 'call', 'messaging', 'referral', 'walk-in')
  ),
  constraint leads_status_valid check (
    status in ('New', 'Contacted', 'Qualified', 'Converted', 'Lost')
  ),
  constraint leads_lost_reason_required check (
    status <> 'Lost'
    or char_length(btrim(coalesce(lost_reason, ''))) > 0
  )
);

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete restrict,
  assigned_to uuid not null references public.profiles (id) on delete restrict,
  due_at timestamptz not null,
  note text not null,
  status text not null default 'pending',
  completed_at timestamptz,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint follow_ups_note_not_blank check (char_length(btrim(note)) > 0),
  constraint follow_ups_status_valid check (
    status in ('pending', 'completed', 'cancelled')
  ),
  constraint follow_ups_completed_at_matches_status check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  )
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete restrict,
  actor_id uuid not null references public.profiles (id) on delete restrict,
  activity_type text not null,
  description text not null,
  metadata jsonb,
  created_at timestamptz not null default now(),
  constraint activities_type_not_blank check (char_length(btrim(activity_type)) > 0),
  constraint activities_description_not_blank check (char_length(btrim(description)) > 0)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index leads_status_idx on public.leads (status);
create index leads_source_idx on public.leads (source);
create index leads_assigned_to_idx on public.leads (assigned_to);
create index leads_created_by_idx on public.leads (created_by);
create index leads_created_at_idx on public.leads (created_at desc);
create index follow_ups_lead_id_idx on public.follow_ups (lead_id);
create index follow_ups_assigned_to_idx on public.follow_ups (assigned_to);
create index follow_ups_status_due_at_idx on public.follow_ups (status, due_at);
create index activities_lead_id_created_at_idx on public.activities (lead_id, created_at desc);
create index profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------------
-- Helpers
-- current_role() and the lead helpers are security definer so policies can
-- read profiles and leads without recursing through row level security.
-- ---------------------------------------------------------------------------

create function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
$$;

create function public.can_access_lead(target_lead uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.leads
    where id = target_lead
      and (
        public.current_role() in ('admin', 'manager')
        or created_by = auth.uid()
        or assigned_to = auth.uid()
      )
  )
$$;

-- A counsellor may update a lead they already created or are assigned.
-- They cannot change created_by, and they cannot hand the lead to someone else.
-- Managers and admins can update any lead, including assignment.
create function public.lead_update_allowed(
  lead_id uuid,
  new_created_by uuid,
  new_assigned_to uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.leads as existing
    where existing.id = lead_id
      and (
        public.current_role() in ('admin', 'manager')
        or (
          (existing.created_by = auth.uid() or existing.assigned_to = auth.uid())
          and existing.created_by = new_created_by
          and (
            new_assigned_to is not distinct from existing.assigned_to
            or new_assigned_to = auth.uid()
            or new_assigned_to is null
          )
        )
      )
  )
$$;

revoke all on function public.current_role() from public;
revoke all on function public.can_access_lead(uuid) from public;
revoke all on function public.lead_update_allowed(uuid, uuid, uuid) from public;
grant execute on function public.current_role() to authenticated;
grant execute on function public.can_access_lead(uuid) to authenticated;
grant execute on function public.lead_update_allowed(uuid, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- No delete policies. Leads are archived, follow-ups are cancelled, and
-- activities stay. The SQL Editor, running as a superuser, can still repair data.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.follow_ups enable row level security;
alter table public.activities enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.leads from anon, authenticated;
revoke all on public.follow_ups from anon, authenticated;
revoke all on public.activities from anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.leads to authenticated;
grant select, insert, update on public.follow_ups to authenticated;
grant select, insert on public.activities to authenticated;

create policy profiles_select_own_or_team
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.current_role() in ('admin', 'manager')
);

create policy profiles_insert_self_as_counsellor
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  and role = 'counsellor'
);

create policy profiles_update_own_name
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and role = public.current_role()
);

create policy leads_select_accessible
on public.leads
for select
to authenticated
using (public.can_access_lead(id));

create policy leads_insert_as_self
on public.leads
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    public.current_role() in ('admin', 'manager')
    or assigned_to is null
    or assigned_to = auth.uid()
  )
);

create policy leads_update_accessible
on public.leads
for update
to authenticated
using (
  public.current_role() in ('admin', 'manager')
  or created_by = auth.uid()
  or assigned_to = auth.uid()
)
with check (public.lead_update_allowed(id, created_by, assigned_to));

create policy follow_ups_select_accessible_lead
on public.follow_ups
for select
to authenticated
using (public.can_access_lead(lead_id));

create policy follow_ups_insert_as_self
on public.follow_ups
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.can_access_lead(lead_id)
);

create policy follow_ups_update_accessible_lead
on public.follow_ups
for update
to authenticated
using (public.can_access_lead(lead_id))
with check (public.can_access_lead(lead_id));

create policy activities_select_accessible_lead
on public.activities
for select
to authenticated
using (public.can_access_lead(lead_id));

create policy activities_insert_as_self
on public.activities
for insert
to authenticated
with check (
  actor_id = auth.uid()
  and public.can_access_lead(lead_id)
);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger leads_set_updated_at
before update on public.leads
for each row
execute function public.set_updated_at();

-- Client sessions have auth.uid(). The SQL Editor does not, so the owner can
-- promote a profile to admin from the dashboard.
create function public.prevent_role_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    raise exception 'role changes are not allowed from the client';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_change
before update on public.profiles
for each row
execute function public.prevent_role_change();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Counsellor'
    ),
    'counsellor'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
