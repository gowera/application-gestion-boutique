UPDATE public.settings
SET extras = coalesce(extras, '{}'::jsonb) || jsonb_build_object(
  'social_linkedin', 'https://www.linkedin.com/in/conetec-services-69907a428',
  'social_youtube', 'https://www.youtube.com/@Conetec-t7c'
)
WHERE id = 1;