// api/proxy.js
// A simple serverless proxy for Vercel.
// Usage: https://your-project.vercel.app/api/proxy?url=https://example.com

export default async function handler(request, response) {
  // 1. Get the target URL from the query parameter
  const targetUrl = request.query.url;

  if (!targetUrl) {
    return response
      .status(400)
      .send('Missing "url" query parameter. Use ?url=https://example.com');
  }

  // 2. Basic sanity check — only allow http/https URLs
  let parsed;
  try {
    parsed = new URL(targetUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Only http and https URLs are allowed.');
    }
  } catch (err) {
    return response
      .status(400)
      .send('Invalid URL provided: ' + err.message);
  }

  try {
    // 3. Fetch the target page
    const upstreamResponse = await fetch(parsed.toString(), {
      headers: {
        // Pretend to be a normal browser so sites don't block us
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    // 4. Forward the content type so the browser renders it correctly
    const contentType = upstreamResponse.headers.get('content-type');
    if (contentType) {
      response.setHeader('Content-Type', contentType);
    }

    // 5. Send the body back
    const body = await upstreamResponse.text();
    return response.status(upstreamResponse.status).send(body);

  } catch (error) {
    // 6. Something went wrong (bad URL, site down, timeout, etc.)
    return response
      .status(500)
      .send('Error fetching the URL: ' + error.message);
  }
}
