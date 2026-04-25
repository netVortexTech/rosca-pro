
CREATE TYPE public.sms_status AS ENUM ('sent', 'failed');

CREATE TABLE public.sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  member_id uuid,
  phone text NOT NULL,
  content text NOT NULL,
  status public.sms_status NOT NULL,
  error text,
  provider_response jsonb,
  kind text,
  sender_id text,
  sent_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX sms_messages_group_id_created_at_idx
  ON public.sms_messages (group_id, created_at DESC);

ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view SMS log"
  ON public.sms_messages FOR SELECT
  USING (
    public.is_group_member(auth.uid(), group_id)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

CREATE POLICY "Group admins insert SMS log"
  ON public.sms_messages FOR INSERT
  WITH CHECK (
    public.is_group_admin(auth.uid(), group_id)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

CREATE POLICY "Group admins update SMS log"
  ON public.sms_messages FOR UPDATE
  USING (
    public.is_group_admin(auth.uid(), group_id)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );
