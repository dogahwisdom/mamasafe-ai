-- Links public.users to Supabase Auth when public.users.id is not a UUID (legacy) or when
-- auth.users.id must differ from the app row id. Used by Netlify auth-pin-bridge + reminder-dispatch JWT lookup.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID;

COMMENT ON COLUMN public.users.auth_user_id IS
  'Supabase auth.users id for PIN-bridge sessions; equals id when id is already a UUID.';

CREATE UNIQUE INDEX IF NOT EXISTS users_auth_user_id_unique
  ON public.users (auth_user_id)
  WHERE auth_user_id IS NOT NULL;
