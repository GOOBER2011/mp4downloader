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
    return response.status(400).send('Invalid URL provided: ' + err.message);
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
    if (contentType) {
      response.setHeader('Content-Type', contentType);
    }

    const body = await upstreamResponse.text();
    return response.status(upstreamResponse.status).send(body);

  } catch (error) {
    return response.status(500).send('Error fetching the URL: ' + error.message);
  }
}
