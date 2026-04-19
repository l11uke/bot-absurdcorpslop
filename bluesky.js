import fetch from "node-fetch";
import { uploadImageToBluesky } from "./images.js";

const BSKY_API = "https://bsky.social/xrpc";

async function createSession() {
  const res = await fetch(`${BSKY_API}/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: process.env.BSKY_HANDLE,
      password: process.env.BSKY_APP_PASSWORD,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Bluesky auth failed: ${res.status} ${err}`);
  }
  return res.json();
}

async function createPost(session, text, replyTo = null, embedImage = null) {
  const record = {
    $type: "app.bsky.feed.post",
    text,
    createdAt: new Date().toISOString(),
  };

  if (replyTo) {
    record.reply = {
      root: replyTo.root,
      parent: replyTo.parent,
    };
  }

  // TODO: wire in when images.js is implemented
  // if (embedImage) {
  //   record.embed = {
  //     $type: "app.bsky.embed.images",
  //     images: [{ image: embedImage, alt: embedImage.alt }],
  //   };
  // }

  const res = await fetch(`${BSKY_API}/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessJwt}`,
    },
    body: JSON.stringify({
      repo: session.did,
      collection: "app.bsky.feed.post",
      record,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Post failed: ${res.status} ${err}`);
  }
  return res.json();
}

function buildPostRef(post) {
  return { uri: post.uri, cid: post.cid };
}

export async function postAd(ad) {
  const session = await createSession();

  // TODO: fetch and upload image when images.js is implemented
  // const imageUrl = await fetchUnsplashImage(ad.imageQuery);
  // const blobRef = imageUrl ? await uploadImageToBluesky(imageUrl, session.accessJwt) : null;

  const post1Text = [
    `[${ad.format.toUpperCase()}]`,
    ad.brandName,
    ad.headline,
  ].join("\n");

  const post1 = await createPost(session, post1Text);
  const post1Ref = buildPostRef(post1);

  const credits = `📡 ${ad.subjectA} + ${ad.subjectB}`;
  const post2Text = `${ad.adCopy}\n\n${credits}`;

  const replyRef = {
    root: post1Ref,
    parent: post1Ref,
  };

  await createPost(session, post2Text, replyRef);

  console.log(`Posted: ${ad.brandName} — ${ad.format}`);
  console.log(`Thread root: ${post1.uri}`);
}