CREATE TABLE public.business_inventory (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  state jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.business_inventory TO authenticated;
GRANT ALL ON public.business_inventory TO service_role;
ALTER TABLE public.business_inventory ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.inventory_member() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id=auth.uid() AND active)
$$;
CREATE OR REPLACE FUNCTION public.inventory_writer() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id=auth.uid() AND active AND (role='admin' OR sales OR inventory))
$$;
CREATE POLICY inventory_read ON public.business_inventory FOR SELECT TO authenticated USING (business_id = my_business() AND inventory_member());
CREATE POLICY inventory_create ON public.business_inventory FOR INSERT TO authenticated WITH CHECK (business_id = my_business() AND business_admin());
CREATE POLICY inventory_write ON public.business_inventory FOR UPDATE TO authenticated USING (business_id = my_business() AND inventory_writer()) WITH CHECK (business_id = my_business() AND inventory_writer());