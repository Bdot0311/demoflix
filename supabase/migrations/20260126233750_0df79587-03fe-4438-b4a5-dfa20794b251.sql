-- Add branding columns to projects table
ALTER TABLE public.projects 
ADD COLUMN logo_url TEXT DEFAULT NULL,
ADD COLUMN brand_color TEXT DEFAULT '#E50914',
ADD COLUMN brand_color_secondary TEXT DEFAULT '#141414',
ADD COLUMN logo_position TEXT DEFAULT 'bottom-right' CHECK (logo_position IN ('top-left', 'top-right', 'bottom-left', 'bottom-right', 'center')),
ADD COLUMN logo_size TEXT DEFAULT 'medium' CHECK (logo_size IN ('small', 'medium', 'large')),
ADD COLUMN show_logo_on_all_scenes BOOLEAN DEFAULT false;

-- Create storage bucket for brand logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-logos', 'brand-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own logos
CREATE POLICY "Users can upload their own brand logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'brand-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow anyone to view brand logos (for rendering)
CREATE POLICY "Brand logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-logos');

-- Allow users to update/delete their own logos
CREATE POLICY "Users can update their own brand logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'brand-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own brand logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'brand-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);