const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapeResult {
  success: boolean;
  screenshot?: string;
  pages?: PageData[];
  images?: string[];
  videos?: string[];
  branding?: BrandingData;
  metadata?: {
    title: string;
    description?: string;
    sourceURL: string;
  };
  content?: ContentData;
  error?: string;
}

interface PageData {
  url: string;
  title: string;
  screenshot?: string;
  description?: string;
  markdown?: string;
  headlines?: string[];
  sections?: SectionData[];
}

interface SectionData {
  type: 'hero' | 'features' | 'testimonial' | 'pricing' | 'cta' | 'demo' | 'stats' | 'general';
  headline?: string;
  subtext?: string;
  content?: string;
  image?: string;
  video?: string;
}

interface BrandingData {
  logo?: string;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
  };
  fonts?: { family: string }[];
  tagline?: string;
}

interface ContentData {
  companyName?: string;
  tagline?: string;
  valueProposition?: string;
  headlines: string[];
  features: FeatureData[];
  testimonials: TestimonialData[];
  stats: StatData[];
  ctaTexts: string[];
  painPoints: string[];
  benefits: string[];
  demoVideos: string[];
  productImages: string[];
}

interface FeatureData {
  title: string;
  description?: string;
  icon?: string;
  image?: string;
}

interface TestimonialData {
  quote: string;
  author?: string;
  role?: string;
  company?: string;
  avatar?: string;
}

interface StatData {
  value: string;
  label: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, mode = 'full' } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping URL in mode:', mode, formattedUrl);

    const result: ScrapeResult = {
      success: true,
      pages: [],
      images: [],
      videos: [],
      content: {
        headlines: [],
        features: [],
        testimonials: [],
        stats: [],
        ctaTexts: [],
        painPoints: [],
        benefits: [],
        demoVideos: [],
        productImages: [],
      },
    };

    // Step 1: Map the website to discover all URLs
    console.log('Step 1: Mapping website...');
    const mapResponse = await fetch('https://api.firecrawl.dev/v1/map', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        limit: 30, // Get up to 30 pages for comprehensive scraping
        includeSubdomains: false,
      }),
    });

    const mapData = await mapResponse.json();
    const discoveredUrls = mapData.links || [formattedUrl];
    console.log('Discovered URLs:', discoveredUrls.length);

    // Step 2: Scrape main page with FULL content extraction
    console.log('Step 2: Scraping main page with full content extraction...');
    const mainPageResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['screenshot', 'links', 'markdown', 'html', 'extract'],
        extract: {
          schema: {
            type: 'object',
            properties: {
              companyName: { type: 'string', description: 'Company or product name' },
              tagline: { type: 'string', description: 'Main tagline or slogan' },
              valueProposition: { type: 'string', description: 'Core value proposition - what problem does it solve' },
              logo: { type: 'string', description: 'URL of the company logo' },
              primaryColor: { type: 'string', description: 'Primary brand color in hex format' },
              secondaryColor: { type: 'string', description: 'Secondary brand color in hex format' },
              accentColor: { type: 'string', description: 'Accent/highlight color in hex format' },
              headlines: { 
                type: 'array', 
                items: { type: 'string' }, 
                description: 'All major headlines and H1/H2 text on the page' 
              },
              features: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    image: { type: 'string' }
                  }
                },
                description: 'Product features with titles, descriptions, and associated images'
              },
              testimonials: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    quote: { type: 'string' },
                    author: { type: 'string' },
                    role: { type: 'string' },
                    company: { type: 'string' },
                    avatar: { type: 'string' }
                  }
                },
                description: 'Customer testimonials and reviews'
              },
              stats: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    value: { type: 'string' },
                    label: { type: 'string' }
                  }
                },
                description: 'Statistics like "10,000+ users", "99.9% uptime", etc.'
              },
              ctaTexts: {
                type: 'array',
                items: { type: 'string' },
                description: 'Call-to-action button texts like "Start Free Trial", "Get Started"'
              },
              painPoints: {
                type: 'array',
                items: { type: 'string' },
                description: 'Problems or pain points mentioned that the product solves'
              },
              benefits: {
                type: 'array',
                items: { type: 'string' },
                description: 'Benefits and outcomes users get from the product'
              },
              images: { 
                type: 'array', 
                items: { type: 'string' }, 
                description: 'URLs of all important images - product screenshots, hero images, feature images' 
              },
              videos: {
                type: 'array',
                items: { type: 'string' },
                description: 'URLs of all videos - demo videos, explainer videos, YouTube embeds, Vimeo, Loom, etc.'
              },
              demoVideos: {
                type: 'array',
                items: { type: 'string' },
                description: 'Specific demo or product walkthrough video URLs'
              }
            }
          }
        },
        waitFor: 5000, // Wait longer for dynamic content to load
      }),
    });

    const mainPageData = await mainPageResponse.json();
    
    if (!mainPageResponse.ok) {
      console.error('Main page scrape failed:', mainPageData);
      return new Response(
        JSON.stringify({ success: false, error: mainPageData.error || 'Failed to scrape main page' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mainData = mainPageData.data || mainPageData;
    result.screenshot = mainData.screenshot;
    
    // Extract ALL content from main page
    const extractedData = mainData.extract || {};
    
    // Populate branding
    result.branding = {
      logo: extractedData.logo || mainData.branding?.logo,
      tagline: extractedData.tagline,
      colors: {
        primary: extractedData.primaryColor || mainData.branding?.colors?.primary,
        secondary: extractedData.secondaryColor || mainData.branding?.colors?.secondary,
        accent: extractedData.accentColor,
        background: mainData.branding?.colors?.background,
      },
      fonts: mainData.branding?.fonts,
    };
    
    result.metadata = {
      title: extractedData.companyName || mainData.metadata?.title || formattedUrl,
      description: extractedData.valueProposition || mainData.metadata?.description,
      sourceURL: formattedUrl,
    };
    
    // Populate content
    result.content!.companyName = extractedData.companyName;
    result.content!.tagline = extractedData.tagline;
    result.content!.valueProposition = extractedData.valueProposition;
    result.content!.headlines = extractedData.headlines || [];
    result.content!.features = extractedData.features || [];
    result.content!.testimonials = extractedData.testimonials || [];
    result.content!.stats = extractedData.stats || [];
    result.content!.ctaTexts = extractedData.ctaTexts || [];
    result.content!.painPoints = extractedData.painPoints || [];
    result.content!.benefits = extractedData.benefits || [];
    
    // Add extracted images
    if (extractedData.images && Array.isArray(extractedData.images)) {
      result.images!.push(...extractedData.images);
      result.content!.productImages.push(...extractedData.images);
    }
    
    // Add extracted videos
    if (extractedData.videos && Array.isArray(extractedData.videos)) {
      result.videos!.push(...extractedData.videos);
    }
    if (extractedData.demoVideos && Array.isArray(extractedData.demoVideos)) {
      result.content!.demoVideos.push(...extractedData.demoVideos);
      result.videos!.push(...extractedData.demoVideos);
    }

    // Parse HTML/markdown for embedded videos (YouTube, Vimeo, Loom, etc.)
    const html = mainData.html || '';
    const markdown = mainData.markdown || '';
    
    // Extract video URLs from HTML
    const videoPatterns = [
      // YouTube
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/gi,
      // Vimeo
      /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/gi,
      // Loom
      /(?:loom\.com\/share\/|loom\.com\/embed\/)([a-zA-Z0-9]+)/gi,
      // Wistia
      /(?:wistia\.com\/medias\/|wistia\.net\/embed\/iframe\/)([a-zA-Z0-9]+)/gi,
      // Direct video files
      /(https?:\/\/[^\s"']+\.(?:mp4|webm|mov|avi|m4v))/gi,
    ];
    
    for (const pattern of videoPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const videoUrl = match[0];
        if (!result.videos!.includes(videoUrl)) {
          result.videos!.push(videoUrl);
          // If it looks like a demo, add to demoVideos
          if (videoUrl.includes('demo') || videoUrl.includes('walkthrough') || videoUrl.includes('tutorial')) {
            result.content!.demoVideos.push(videoUrl);
          }
        }
      }
    }

    // Add main page to pages list with full content
    result.pages!.push({
      url: formattedUrl,
      title: mainData.metadata?.title || 'Home',
      screenshot: mainData.screenshot,
      description: mainData.metadata?.description,
      markdown: markdown,
      headlines: extractedData.headlines || [],
    });

    // Extract images from links
    const allLinks = mainData.links || [];
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif'];
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.m4v'];

    for (const link of allLinks) {
      const linkLower = link.toLowerCase();
      if (imageExtensions.some(ext => linkLower.includes(ext))) {
        if (!result.images!.includes(link)) {
          result.images!.push(link);
        }
      }
      if (videoExtensions.some(ext => linkLower.includes(ext))) {
        if (!result.videos!.includes(link)) {
          result.videos!.push(link);
        }
      }
    }

    // Step 3: Scrape key pages for more content (if full mode)
    if (mode === 'full' && discoveredUrls.length > 1) {
      console.log('Step 3: Scraping additional pages for more content...');
      
      // Priority order for pages to scrape - expanded list
      const priorityKeywords = [
        'features', 'demo', 'product', 'how-it-works', 'tour',
        'pricing', 'testimonials', 'reviews', 'customers', 'case-study',
        'about', 'solutions', 'use-cases', 'examples', 'showcase'
      ];
      
      // Sort URLs by priority
      const sortedUrls = discoveredUrls
        .filter((u: string) => u !== formattedUrl)
        .sort((a: string, b: string) => {
          const aLower = a.toLowerCase();
          const bLower = b.toLowerCase();
          const aPriority = priorityKeywords.findIndex(k => aLower.includes(k));
          const bPriority = priorityKeywords.findIndex(k => bLower.includes(k));
          if (aPriority === -1 && bPriority === -1) return 0;
          if (aPriority === -1) return 1;
          if (bPriority === -1) return -1;
          return aPriority - bPriority;
        })
        .slice(0, 8); // Get top 8 priority pages for comprehensive scraping
      
      // Scrape each page for content
      for (const pageUrl of sortedUrls) {
        try {
          console.log('Scraping page:', pageUrl);
          const pageResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: pageUrl,
              formats: ['screenshot', 'links', 'markdown', 'html', 'extract'],
              extract: {
                schema: {
                  type: 'object',
                  properties: {
                    headlines: { 
                      type: 'array', 
                      items: { type: 'string' }, 
                      description: 'All major headlines and H1/H2 text' 
                    },
                    features: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          title: { type: 'string' },
                          description: { type: 'string' },
                          image: { type: 'string' }
                        }
                      },
                      description: 'Product features'
                    },
                    testimonials: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          quote: { type: 'string' },
                          author: { type: 'string' },
                          role: { type: 'string' },
                          company: { type: 'string' }
                        }
                      },
                      description: 'Customer testimonials'
                    },
                    images: { 
                      type: 'array', 
                      items: { type: 'string' }, 
                      description: 'Important image URLs' 
                    },
                    videos: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Video URLs'
                    }
                  }
                }
              },
              waitFor: 3000,
            }),
          });

          if (pageResponse.ok) {
            const pageData = await pageResponse.json();
            const data = pageData.data || pageData;
            const pageExtract = data.extract || {};
            
            if (data.screenshot) {
              // Extract page name from URL
              const urlPath = new URL(pageUrl).pathname;
              const pageName = urlPath.split('/').filter(Boolean).pop() || 'page';
              
              result.pages!.push({
                url: pageUrl,
                title: data.metadata?.title || pageName.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
                screenshot: data.screenshot,
                description: data.metadata?.description,
                markdown: data.markdown,
                headlines: pageExtract.headlines || [],
              });

              // Merge extracted content
              if (pageExtract.headlines) {
                result.content!.headlines.push(...pageExtract.headlines);
              }
              if (pageExtract.features) {
                result.content!.features.push(...pageExtract.features);
              }
              if (pageExtract.testimonials) {
                result.content!.testimonials.push(...pageExtract.testimonials);
              }
              if (pageExtract.images) {
                for (const img of pageExtract.images) {
                  if (!result.images!.includes(img)) {
                    result.images!.push(img);
                    result.content!.productImages.push(img);
                  }
                }
              }
              if (pageExtract.videos) {
                for (const vid of pageExtract.videos) {
                  if (!result.videos!.includes(vid)) {
                    result.videos!.push(vid);
                  }
                }
              }

              // Extract videos from HTML
              const pageHtml = data.html || '';
              for (const pattern of videoPatterns) {
                let match;
                while ((match = pattern.exec(pageHtml)) !== null) {
                  const videoUrl = match[0];
                  if (!result.videos!.includes(videoUrl)) {
                    result.videos!.push(videoUrl);
                  }
                }
              }

              // Extract additional media from links
              const pageLinks = data.links || [];
              for (const link of pageLinks) {
                const linkLower = link.toLowerCase();
                if (imageExtensions.some(ext => linkLower.includes(ext)) && !result.images!.includes(link)) {
                  result.images!.push(link);
                }
                if (videoExtensions.some(ext => linkLower.includes(ext)) && !result.videos!.includes(link)) {
                  result.videos!.push(link);
                }
              }
            }
          }
        } catch (pageError) {
          console.error('Error scraping page:', pageUrl, pageError);
        }
      }
    }

    // Deduplicate and clean up
    result.images = [...new Set(result.images!)].slice(0, 50); // Increased limit
    result.videos = [...new Set(result.videos!)].slice(0, 20); // Increased limit
    result.content!.headlines = [...new Set(result.content!.headlines)];
    result.content!.productImages = [...new Set(result.content!.productImages)].slice(0, 30);
    result.content!.demoVideos = [...new Set(result.content!.demoVideos)].slice(0, 10);
    
    // Dedupe testimonials by quote
    const seenQuotes = new Set<string>();
    result.content!.testimonials = result.content!.testimonials.filter(t => {
      if (seenQuotes.has(t.quote)) return false;
      seenQuotes.add(t.quote);
      return true;
    });
    
    // Dedupe features by title
    const seenFeatures = new Set<string>();
    result.content!.features = result.content!.features.filter(f => {
      if (seenFeatures.has(f.title)) return false;
      seenFeatures.add(f.title);
      return true;
    });

    console.log('Scrape complete!');
    console.log('Pages:', result.pages!.length);
    console.log('Images:', result.images!.length);
    console.log('Videos:', result.videos!.length);
    console.log('Features:', result.content!.features.length);
    console.log('Testimonials:', result.content!.testimonials.length);
    console.log('Headlines:', result.content!.headlines.length);
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping website:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape website';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
