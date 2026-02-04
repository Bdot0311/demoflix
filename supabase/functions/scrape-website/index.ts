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
  error?: string;
}

interface PageData {
  url: string;
  title: string;
  screenshot?: string;
  description?: string;
}

interface BrandingData {
  logo?: string;
  colors?: {
    primary?: string;
    secondary?: string;
    background?: string;
  };
  fonts?: { family: string }[];
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
        limit: 20, // Get up to 20 pages
        includeSubdomains: false,
      }),
    });

    const mapData = await mapResponse.json();
    const discoveredUrls = mapData.links || [formattedUrl];
    console.log('Discovered URLs:', discoveredUrls.length);

    // Step 2: Scrape main page with full details
    console.log('Step 2: Scraping main page...');
    const mainPageResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['screenshot', 'links', 'markdown', 'extract'],
        extract: {
          schema: {
            type: 'object',
            properties: {
              logo: { type: 'string', description: 'URL of the company logo' },
              images: { type: 'array', items: { type: 'string' }, description: 'URLs of important images on the page' },
              primaryColor: { type: 'string', description: 'Primary brand color in hex format' },
              secondaryColor: { type: 'string', description: 'Secondary brand color in hex format' },
            }
          }
        },
        waitFor: 3000,
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
    
    // Extract branding from extract results or existing branding data
    const extractedData = mainData.extract || {};
    result.branding = {
      logo: extractedData.logo || mainData.branding?.logo,
      colors: {
        primary: extractedData.primaryColor || mainData.branding?.colors?.primary,
        secondary: extractedData.secondaryColor || mainData.branding?.colors?.secondary,
        background: mainData.branding?.colors?.background,
      },
      fonts: mainData.branding?.fonts,
    };
    
    result.metadata = {
      title: mainData.metadata?.title || formattedUrl,
      description: mainData.metadata?.description,
      sourceURL: formattedUrl,
    };
    
    // Add extracted images to our images array
    if (extractedData.images && Array.isArray(extractedData.images)) {
      result.images!.push(...extractedData.images);
    }

    // Add main page to pages list
    result.pages!.push({
      url: formattedUrl,
      title: mainData.metadata?.title || 'Home',
      screenshot: mainData.screenshot,
      description: mainData.metadata?.description,
    });

    // Extract images from links (looking for image URLs)
    const allLinks = mainData.links || [];
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi'];

    for (const link of allLinks) {
      const linkLower = link.toLowerCase();
      if (imageExtensions.some(ext => linkLower.includes(ext))) {
        result.images!.push(link);
      }
      if (videoExtensions.some(ext => linkLower.includes(ext))) {
        result.videos!.push(link);
      }
    }

    // Step 3: Scrape key pages for screenshots (if full mode)
    if (mode === 'full' && discoveredUrls.length > 1) {
      console.log('Step 3: Scraping additional pages...');
      
      // Priority order for pages to scrape
      const priorityKeywords = ['features', 'pricing', 'about', 'product', 'demo', 'how-it-works', 'solutions'];
      
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
        .slice(0, 5); // Get top 5 priority pages
      
      // Scrape each page for screenshots
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
              formats: ['screenshot', 'links'],
              waitFor: 2000,
            }),
          });

          if (pageResponse.ok) {
            const pageData = await pageResponse.json();
            const data = pageData.data || pageData;
            
            if (data.screenshot) {
              // Extract page name from URL
              const urlPath = new URL(pageUrl).pathname;
              const pageName = urlPath.split('/').filter(Boolean).pop() || 'page';
              
              result.pages!.push({
                url: pageUrl,
                title: data.metadata?.title || pageName.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
                screenshot: data.screenshot,
                description: data.metadata?.description,
              });

              // Extract additional media from this page
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

    // Limit images/videos to avoid huge responses
    result.images = result.images!.slice(0, 20);
    result.videos = result.videos!.slice(0, 10);

    console.log('Scrape complete. Pages:', result.pages!.length, 'Images:', result.images!.length, 'Videos:', result.videos!.length);
    
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
