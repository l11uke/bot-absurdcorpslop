import fetch from "node-fetch";

export async function fetchUnsplashImage(query) {
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
    { headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` } }
  );
  if (!res.ok) throw new Error(`Unsplash API error: ${res.status}`);
  const data = await res.json();
  if (!data.results?.length) return null;
  // Pick randomly from top 5 results for variety
  const pick = data.results[Math.floor(Math.random() * data.results.length)];
  return {
    url: pick.urls.regular,
    alt: query,
  };
}

export async function uploadImageToBluesky(image, accessJwt) {
  // Fetch image bytes from Unsplash
  const imgRes = await fetch(image.url);
  if (!imgRes.ok) throw new Error(`Failed to fetch image: ${imgRes.status}`);
  const buffer = await imgRes.buffer();
  const contentType = imgRes.headers.get("content-type") || "image/jpeg";

  // Upload blob to Bluesky
  const uploadRes = await fetch("https://bsky.social/xrpc/com.atproto.repo.uploadBlob", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessJwt}`,
      "Content-Type": contentType,
    },
    body: buffer,
  });
  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Blob upload failed: ${uploadRes.status} ${err}`);
  }
  const uploadData = await uploadRes.json();
  return {
    blob: uploadData.blob,
    alt: image.alt,
  };
}