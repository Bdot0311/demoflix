// Voiceover synchronization utilities
// Maps word timestamps from ElevenLabs to Remotion frame numbers

export interface WordTiming {
  word: string;
  start: number; // in seconds
  end: number; // in seconds
}

export interface VoiceoverSegment {
  text: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  words?: WordTiming[];
}

export interface SceneVoiceover {
  sceneId: string;
  script: string;
  audioUrl?: string;
  segments: VoiceoverSegment[];
  totalDuration: number; // in seconds
}

// Convert time in seconds to frame number
export const timeToFrame = (timeSeconds: number, fps: number = 30): number => {
  return Math.round(timeSeconds * fps);
};

// Convert frame number to time in seconds
export const frameToTime = (frame: number, fps: number = 30): number => {
  return frame / fps;
};

// Get the word that should be highlighted at a given frame
export const getActiveWord = (
  frame: number,
  words: WordTiming[],
  fps: number = 30
): { word: string; index: number } | null => {
  const currentTime = frameToTime(frame, fps);
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (currentTime >= word.start && currentTime < word.end) {
      return { word: word.word, index: i };
    }
  }
  
  return null;
};

// Get progress through current word (0-1)
export const getWordProgress = (
  frame: number,
  words: WordTiming[],
  fps: number = 30
): number => {
  const currentTime = frameToTime(frame, fps);
  
  for (const word of words) {
    if (currentTime >= word.start && currentTime < word.end) {
      const wordDuration = word.end - word.start;
      const elapsed = currentTime - word.start;
      return Math.min(1, elapsed / wordDuration);
    }
  }
  
  return 0;
};

// Get list of words that have been spoken up to current frame
export const getSpokenWords = (
  frame: number,
  words: WordTiming[],
  fps: number = 30
): string[] => {
  const currentTime = frameToTime(frame, fps);
  return words.filter(w => w.start <= currentTime).map(w => w.word);
};

// Calculate scene durations based on voiceover timing
export const calculateSceneDurations = (
  segments: VoiceoverSegment[],
  minSceneDuration: number = 3, // minimum 3 seconds
  paddingSeconds: number = 0.5 // padding after voiceover ends
): number[] => {
  return segments.map(segment => {
    const voiceoverDuration = segment.endTime - segment.startTime;
    return Math.max(minSceneDuration, voiceoverDuration + paddingSeconds);
  });
};

// Parse ElevenLabs word timing response
export const parseElevenLabsTimings = (
  alignmentData: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  }
): WordTiming[] => {
  const words: WordTiming[] = [];
  let currentWord = "";
  let wordStart = 0;
  let wordEnd = 0;
  
  for (let i = 0; i < alignmentData.characters.length; i++) {
    const char = alignmentData.characters[i];
    const startTime = alignmentData.character_start_times_seconds[i];
    const endTime = alignmentData.character_end_times_seconds[i];
    
    if (char === " " || char === "\n") {
      // End of word
      if (currentWord) {
        words.push({
          word: currentWord,
          start: wordStart,
          end: wordEnd,
        });
        currentWord = "";
      }
    } else {
      // Part of a word
      if (!currentWord) {
        wordStart = startTime;
      }
      currentWord += char;
      wordEnd = endTime;
    }
  }
  
  // Don't forget the last word
  if (currentWord) {
    words.push({
      word: currentWord,
      start: wordStart,
      end: wordEnd,
    });
  }
  
  return words;
};

// Generate animation triggers based on word timings
export interface AnimationTrigger {
  frame: number;
  type: "word-start" | "word-end" | "phrase-start" | "phrase-end";
  wordIndex: number;
  word: string;
}

export const generateAnimationTriggers = (
  words: WordTiming[],
  fps: number = 30
): AnimationTrigger[] => {
  const triggers: AnimationTrigger[] = [];
  
  words.forEach((word, index) => {
    triggers.push({
      frame: timeToFrame(word.start, fps),
      type: "word-start",
      wordIndex: index,
      word: word.word,
    });
    
    triggers.push({
      frame: timeToFrame(word.end, fps),
      type: "word-end",
      wordIndex: index,
      word: word.word,
    });
  });
  
  return triggers.sort((a, b) => a.frame - b.frame);
};

// Create a script segmented by scene for AI generation
export interface ScriptSegment {
  sceneType: string;
  voiceoverText: string;
  estimatedDuration: number; // in seconds
}

export const segmentScript = (
  content: {
    painPoints?: string[];
    tagline?: string;
    companyName?: string;
    features?: Array<{ title: string; description?: string }>;
    stats?: Array<{ value: string; label: string }>;
    testimonials?: Array<{ quote: string; author?: string }>;
    ctaTexts?: string[];
  }
): ScriptSegment[] => {
  const segments: ScriptSegment[] = [];
  
  // Intro / Pain point
  if (content.painPoints && content.painPoints.length > 0) {
    segments.push({
      sceneType: "pain-point",
      voiceoverText: content.painPoints[0],
      estimatedDuration: 4,
    });
  }
  
  // Solution intro
  if (content.companyName) {
    segments.push({
      sceneType: "solution",
      voiceoverText: `Introducing ${content.companyName}. ${content.tagline || "The smarter way to work."}`,
      estimatedDuration: 4,
    });
  }
  
  // Features
  if (content.features && content.features.length > 0) {
    content.features.slice(0, 3).forEach((feature) => {
      segments.push({
        sceneType: "feature",
        voiceoverText: feature.description || feature.title,
        estimatedDuration: 4,
      });
    });
  }
  
  // Stats
  if (content.stats && content.stats.length > 0) {
    const statText = content.stats
      .slice(0, 3)
      .map(s => `${s.value} ${s.label}`)
      .join(". ");
    segments.push({
      sceneType: "stats",
      voiceoverText: statText,
      estimatedDuration: 4,
    });
  }
  
  // Testimonial
  if (content.testimonials && content.testimonials.length > 0) {
    const testimonial = content.testimonials[0];
    segments.push({
      sceneType: "testimonial",
      voiceoverText: testimonial.quote,
      estimatedDuration: 5,
    });
  }
  
  // CTA
  if (content.ctaTexts && content.ctaTexts.length > 0) {
    segments.push({
      sceneType: "cta",
      voiceoverText: `${content.ctaTexts[0]}. Get started today.`,
      estimatedDuration: 3,
    });
  }
  
  return segments;
};
