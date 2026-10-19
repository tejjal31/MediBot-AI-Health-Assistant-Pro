/*
# Harden touch_updated_at search_path

Sets an explicit `search_path` on the `touch_updated_at()` trigger function
to clear the "function search_path mutable" security advisor warning. This is
a defensive best practice and does not change behavior.
*/

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
