import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set up API routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Link preview fetching API
  app.get('/api/link-preview', async (req, res) => {
    const urlString = req.query.url as string;
    if (!urlString) {
      res.status(400).json({ error: 'URL parameter is required.' });
      return;
    }

    try {
      // Validate that it's a valid HTTP/HTTPS URL
      const targetUrl = new URL(urlString);
      if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
        res.status(400).json({ error: 'Only HTTP and HTTPS protocols are supported.' });
        return;
      }

      // Fetch the webpage with a timeout (5 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(urlString, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        // If it's an image or something else direct, return it simple
        if (contentType.includes('image/')) {
          res.json({
            title: targetUrl.hostname,
            description: `Direct Image Link`,
            image: urlString,
            url: urlString,
            siteName: targetUrl.hostname
          });
          return;
        }
        res.json({
          title: targetUrl.hostname,
          description: `Direct link to a ${contentType.split(';')[0]} file.`,
          image: '',
          url: urlString,
          siteName: targetUrl.hostname
        });
        return;
      }

      const html = await response.text();

      // Find all meta tags
      const metaTagRegex = /<meta\s+([^>]+)>/gi;
      let match;
      let ogTitle = '';
      let ogDesc = '';
      let ogImage = '';
      let ogSiteName = '';
      let metaDesc = '';
      let twitterTitle = '';
      let twitterDesc = '';
      let twitterImage = '';

      while ((match = metaTagRegex.exec(html)) !== null) {
        const contentStr = match[1];

        // Extract content attribute (supports content="val" or content='val')
        const contentMatch = contentStr.match(/content=["']([^"']*)["']/i);
        const contentVal = contentMatch ? contentMatch[1] : '';

        // Extract property or name attribute
        const propertyMatch = contentStr.match(/(?:property|name)=["']([^"']+)["']/i);
        const propVal = propertyMatch ? propertyMatch[1] : '';

        if (propVal && contentVal) {
          const lowerProp = propVal.toLowerCase();
          if (lowerProp === 'og:title') ogTitle = contentVal;
          else if (lowerProp === 'og:description') ogDesc = contentVal;
          else if (lowerProp === 'og:image') ogImage = contentVal;
          else if (lowerProp === 'og:site_name') ogSiteName = contentVal;
          else if (lowerProp === 'description') metaDesc = contentVal;
          else if (lowerProp === 'twitter:title') twitterTitle = contentVal;
          else if (lowerProp === 'twitter:description') twitterDesc = contentVal;
          else if (lowerProp === 'twitter:image') twitterImage = contentVal;
        }
      }

      // Simple HTML decode helper
      const decodeHTMLEntities = (str: string): string => {
        return str
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&#39;/g, "'")
          .replace(/&#x27;/g, "'")
          .replace(/&#x2F;/g, '/')
          .replace(/&rsquo;/g, "'")
          .replace(/&lsquo;/g, "'")
          .replace(/&rdquo;/g, '"')
          .replace(/&ldquo;/g, '"')
          .replace(/&ndash;/g, '-')
          .replace(/&mdash;/g, '--');
      };

      // Fallback hierarchy for fields
      let title = ogTitle || twitterTitle;
      if (!title) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
          title = titleMatch[1];
        }
      }

      const description = ogDesc || twitterDesc || metaDesc || '';
      const image = ogImage || twitterImage || '';
      const siteName = ogSiteName || targetUrl.hostname;

      // Handle relative image URLs by converting them to absolute
      let absoluteImage = image;
      if (image && !image.startsWith('http://') && !image.startsWith('https://')) {
        try {
          absoluteImage = new URL(image, urlString).toString();
        } catch (_) {}
      }

      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.json({
        title: decodeHTMLEntities(title || targetUrl.hostname).trim(),
        description: decodeHTMLEntities(description).trim(),
        image: absoluteImage,
        url: urlString,
        siteName: decodeHTMLEntities(siteName).trim()
      });

    } catch (error: any) {
      console.error(`Link preview parser failed for ${urlString}:`, error);
      try {
        const parsedUrl = new URL(urlString);
        res.json({
          title: parsedUrl.hostname,
          description: `Visit ${parsedUrl.hostname} to read more.`,
          image: '',
          url: urlString,
          siteName: parsedUrl.hostname
        });
      } catch (_) {
        res.status(400).json({ error: 'Invalid URL provided.' });
      }
    }
  });

  // Mount Vite middleware for development or serve custom build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
