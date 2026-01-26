-- Add selected_music_track column to projects table
ALTER TABLE public.projects 
ADD COLUMN selected_music_track TEXT DEFAULT NULL;

-- Add music_volume column for fine-tuning audio levels
ALTER TABLE public.projects 
ADD COLUMN music_volume INTEGER DEFAULT 80 CHECK (music_volume >= 0 AND music_volume <= 100);

-- Seed the music_tracks table with royalty-free tracks (using proper UUIDs)
INSERT INTO public.music_tracks (id, name, artist, category, duration_seconds, file_url, preview_url) VALUES
  (gen_random_uuid(), 'Epic Cinematic Rise', 'Cinematic Studio', 'Cinematic', 60, 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3', 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3'),
  (gen_random_uuid(), 'Digital Future', 'TechSounds', 'Tech', 45, 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_8cb749d484.mp3', 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_8cb749d484.mp3'),
  (gen_random_uuid(), 'Energy Buildup', 'DropBeats', 'Hype', 30, 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_632c696ea0.mp3', 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_632c696ea0.mp3'),
  (gen_random_uuid(), 'Peaceful Journey', 'ChillWave', 'Ambient', 60, 'https://cdn.pixabay.com/download/audio/2022/02/22/audio_d1718ab41b.mp3', 'https://cdn.pixabay.com/download/audio/2022/02/22/audio_d1718ab41b.mp3'),
  (gen_random_uuid(), 'Suspense Rising', 'OrchestraX', 'Cinematic', 45, 'https://cdn.pixabay.com/download/audio/2022/04/27/audio_67bcb10c6b.mp3', 'https://cdn.pixabay.com/download/audio/2022/04/27/audio_67bcb10c6b.mp3'),
  (gen_random_uuid(), 'Business Success', 'BizTunes', 'Corporate', 30, 'https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3', 'https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3'),
  (gen_random_uuid(), 'Action Hero', 'ActionScore', 'Action', 45, 'https://cdn.pixabay.com/download/audio/2022/06/07/audio_b9e1c9b812.mp3', 'https://cdn.pixabay.com/download/audio/2022/06/07/audio_b9e1c9b812.mp3'),
  (gen_random_uuid(), 'Rise and Shine', 'InspireMusic', 'Inspiring', 60, 'https://cdn.pixabay.com/download/audio/2022/05/16/audio_dbdc0c80c9.mp3', 'https://cdn.pixabay.com/download/audio/2022/05/16/audio_dbdc0c80c9.mp3');