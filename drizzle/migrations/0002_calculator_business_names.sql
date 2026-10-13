ALTER TABLE public.businesses ADD COLUMN calculator_3d_name text NOT NULL DEFAULT 'Impresión 3D', ADD COLUMN calculator_trade_name text NOT NULL DEFAULT 'Mayorista / artesanal';
ALTER TABLE public.businesses ALTER COLUMN name SET DEFAULT 'Rauff';
CREATE OR REPLACE FUNCTION public.create_account_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b uuid; inv public.invitations;
BEGIN
SELECT * INTO inv FROM public.invitations WHERE lower(email)=lower(NEW.email) AND accepted_at IS NULL ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
IF inv.id IS NOT NULL THEN b:=inv.business_id;
ELSE INSERT INTO public.businesses DEFAULT VALUES RETURNING id INTO b; END IF;
INSERT INTO public.profiles(id,business_id,name,email) VALUES(NEW.id,b,coalesce(NEW.raw_user_meta_data->>'name',inv.name,''),NEW.email);
INSERT INTO public.user_roles(user_id,business_id,role,sales,costs,inventory) VALUES(NEW.id,b,coalesce(inv.role,'admin'),coalesce(inv.sales,true),coalesce(inv.costs,true),coalesce(inv.inventory,true));
IF inv.id IS NOT NULL THEN UPDATE public.invitations SET accepted_at=now() WHERE id=inv.id; END IF;
RETURN NEW; END $$;