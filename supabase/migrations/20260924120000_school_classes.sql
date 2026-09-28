CREATE TABLE IF NOT EXISTS public.school_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  lead_teacher TEXT,
  student_count INTEGER NOT NULL DEFAULT 0,
  average_score NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_school_classes_school_id ON public.school_classes(school_id);
ALTER TABLE public.school_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Schools can view their classes" ON public.school_classes;
CREATE POLICY "Schools can view their classes" ON public.school_classes
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.schools s WHERE s.id = school_classes.school_id AND s.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Schools can create their classes" ON public.school_classes;
CREATE POLICY "Schools can create their classes" ON public.school_classes
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.schools s WHERE s.id = school_classes.school_id AND s.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Schools can update their classes" ON public.school_classes;
CREATE POLICY "Schools can update their classes" ON public.school_classes
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.schools s WHERE s.id = school_classes.school_id AND s.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Schools can delete their classes" ON public.school_classes;
CREATE POLICY "Schools can delete their classes" ON public.school_classes
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.schools s WHERE s.id = school_classes.school_id AND s.user_id = auth.uid()
  ));
