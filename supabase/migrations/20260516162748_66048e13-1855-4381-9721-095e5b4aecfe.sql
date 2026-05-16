
-- 1) Attach missing trigger so profiles + roles get created on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2) Reports table
CREATE TYPE public.report_target AS ENUM ('post', 'reply', 'user');
CREATE TYPE public.report_status AS ENUM ('open', 'resolved', 'dismissed');

CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL,
  target_type public.report_target NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 1000),
  status public.report_status NOT NULL DEFAULT 'open',
  resolver_id UUID,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_reports_reporter ON public.reports(reporter_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create reports"
ON public.reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id AND NOT public.is_banned(auth.uid()));

CREATE POLICY "Reporter or staff view"
ON public.reports FOR SELECT
USING (
  auth.uid() = reporter_id
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
);

CREATE POLICY "Staff update reports"
ON public.reports FOR UPDATE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins delete reports"
ON public.reports FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER reports_touch_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
