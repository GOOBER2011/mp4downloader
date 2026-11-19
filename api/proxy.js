export default async function handler(request, response) {
  const targetUrl = request.query.url;

  if (!targetUrl) {
    return response.status(400).send('Missing "url" query parameter.');
  }

  let parsed;
  try {
    parsed = new URL(targetUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Only http and https URLs are allowed.');
    }
  } catch (err) {
    return response.status(400).send('Invalid URL: ' + err.message);
  }

  try {
    const upstreamResponse = await fetch(parsed.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    const contentType = upstreamResponse.headers.get('content-type');
    
    // If it's not HTML (e.g., an image, CSS, or JS file), just pass it through normally
    if (!contentType || !contentType.includes('text/html')) {
      if (contentType) response.setHeader('Content-Type', contentType);
      const buffer = await upstreamResponse.arrayBuffer();
      return response.status(upstreamResponse.status).send(Buffer.from(buffer));
    }

    // --- HTML REWRITING SECTION ---
    let html = await upstreamResponse.text();
    const baseUrl = parsed.origin;

    // 1. Rewrite all standard links (<a href="...">)
    html = html.replace(/(<a\s+[^>]*href=["'])([^"']+)(["'])/gi, (match, p1, url, p3) => {
      return p1 + `/api/proxy?url=` + encodeURIComponent(new URL(url, baseUrl).toString()) + p3;
    });

    // 2. Rewrite all forms (like Google's search bar)
    html = html.replace(/(<form\s+[^>]*action=["'])([^"']+)(["'])/gi, (match, p1, url, p3) => {
      return p1 + `/api/proxy?url=` + encodeURIComponent(new URL(url, baseUrl).toString()) + p3;
    });

    // 3. Rewrite images (<img src="...">) so they actually load
    html = html.replace(/(<img\s+[^>]*src=["'])([^"']+)(["'])/gi, (match, p1, url, p3) => {
      return p1 + `/api/proxy?url=` + encodeURIComponent(new URL(url, baseUrl).toString()) + p3;
    });

    // 4. Rewrite CSS (<link href="...">) so pages don't look ugly
    html = html.replace(/(<link\s+[^>]*href=["'])([^"']+)(["'])/gi, (match, p1, url, p3) => {
      return p1 + `/api/proxy?url=` + encodeURIComponent(new URL(url, baseUrl).toString()) + p3;
    });

    response.setHeader('Content-Type', 'text/html');
    return response.status(upstreamResponse.status).send(html);

  } catch (error) {
    return response.status(500).send('Error fetching the URL: ' + error.message);
  }
}
