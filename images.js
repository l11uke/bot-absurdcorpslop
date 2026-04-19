// TODO: Image embedding
//
// Two steps required:
//   1. Fetch image bytes from Unsplash
//   2. Upload as blob via com.atproto.repo.uploadBlob, get back a blob ref CID
//      The blob ref then gets attached to the post record in bluesky.js
//
// Bluesky image embed shape:
//   {
//     $type: "app.bsky.embed.images",
//     images: [{
//       image: <blobRef from uploadBlob>,
//       alt: "<imageQuery>",
//     }]
//   }
//
// uploadBlob endpoint: POST https://bsky.social/xrpc/com.atproto.repo.uploadBlob
// Headers: Authorization: Bearer <accessJwt>, Content-Type: <image mime type>
// Body: raw image bytes

import fetch from "node-fetch";

export async function fetchUnsplashImage(query) {
  // TODO: implement
  // const res = await fetch(
  //   `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
  //   { headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` } }
  // );
  // const data = await res.json();
  // if (!data.results?.length) return null;
  // return data.results[0].urls.regular;
  return null;
}

export async function uploadImageToBluesky(imageUrl, accessJwt) {
  // TODO: implement
  // 1. Fetch image bytes from imageUrl
  // const imgRes = await fetch(imageUrl);
  // const buffer = await imgRes.buffer();
  // const contentType = imgRes.headers.get("content-type") || "image/jpeg";
  //
  // 2. Upload to Bluesky
  // const uploadRes = await fetch("https://bsky.social/xrpc/com.atproto.repo.uploadBlob", {
  //   method: "POST",
  //   headers: {
  //     Authorization: `Bearer ${accessJwt}`,
  //     "Content-Type": contentType,
  //   },
  //   body: buffer,
  // });
  // const uploadData = await uploadRes.json();
  // return uploadData.blob;
  return null;
}