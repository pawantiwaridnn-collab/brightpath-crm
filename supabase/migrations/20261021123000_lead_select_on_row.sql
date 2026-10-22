-- Let an insert return the new lead.
-- can_access_lead() reads public.leads again, and that lookup does not see
-- the row still being inserted, so INSERT ... RETURNING was rejected.

drop policy leads_select_accessible on public.leads;

create policy leads_select_accessible
on public.leads
for select
to authenticated
using (
  public.current_role() in ('admin', 'manager')
  or created_by = auth.uid()
  or assigned_to = auth.uid()
);
