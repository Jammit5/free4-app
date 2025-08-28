-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create new policy that allows users to update their own profile including avatar_url
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Also make sure we have proper insert policy
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);