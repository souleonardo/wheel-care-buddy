
-- Drop the existing locador SELECT policy
DROP POLICY IF EXISTS "Locadores can view own revisions" ON public.revisions;

-- Create new policy that filters by assignment period
CREATE POLICY "Locadores can view own revisions"
ON public.revisions
FOR SELECT
USING (
  has_role(auth.uid(), 'locador'::app_role)
  AND (
    auth.uid() = requested_by
    OR EXISTS (
      SELECT 1 FROM public.vehicle_assignments va
      WHERE va.vehicle_id = revisions.vehicle_id
        AND va.renter_id = auth.uid()
        AND revisions.scheduled_date >= va.assigned_at::date
        AND (va.released_at IS NULL OR revisions.scheduled_date <= va.released_at::date)
    )
  )
);
