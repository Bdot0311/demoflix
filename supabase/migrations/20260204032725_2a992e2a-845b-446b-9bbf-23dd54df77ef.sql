-- Phase 1: Add motion_config column to scenes table to store AI-generated animation data
ALTER TABLE public.scenes ADD COLUMN motion_config jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN public.scenes.motion_config IS 'Stores full motion configuration including cursor_path, zoom_targets, ui_highlights, animation_style, spring physics, and effects';
