-- Allow the creator to read their own groups (needed for INSERT ... RETURNING and to see groups before adding self as member).
CREATE POLICY "Creators view own groups"
ON public.groups
FOR SELECT
TO authenticated
USING (created_by = auth.uid());