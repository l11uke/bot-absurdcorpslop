import fetch from "node-fetch";
import { fetchUnsplashImage, uploadImageToBluesky } from "./images.js";

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

  if (embedImage) {
    record.embed = {
      $type: "app.bsky.embed.images",
      images: [{ image: embedImage.blob, alt: embedImage.alt }],
    };
  }

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

export async function deletePost(uri) {
  const session = await createSession();
  const [, , , did, , rkey] = uri.split("/");
  const res = await fetch(`${BSKY_API}/com.atproto.repo.deleteRecord`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessJwt}`,
    },
    body: JSON.stringify({
      repo: did,
      collection: "app.bsky.feed.post",
      rkey,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Delete failed: ${res.status} ${err}`);
  }
  console.log(`Deleted post: ${uri}`);
}

export async function postAd(ad) {
  const session = await createSession();

  const image = await fetchUnsplashImage(ad.imageQuery);
  const blobRef = image ? await uploadImageToBluesky(image, session.accessJwt) : null;

  const truncate = (str, max) => str.length > max ? str.slice(0, max - 1) + "…" : str;
  const credits = `#satire #absurdcorpslop`;

  const header = `[${ad.format.toUpperCase()}]\n${ad.brandName}\n`;
  const footer = `\n${credits}`;
  const headlineMax = 300 - header.length - footer.length;
  const headline = truncate(ad.headline, headlineMax);
  const post1Text = `${header}${headline}${footer}`;

  const post1 = await createPost(session, post1Text, null, blobRef);
  const post1Ref = buildPostRef(post1);

    const post2Text = truncate(ad.adCopy, 300);


  const replyRef = {
    root: post1Ref,
    parent: post1Ref,
  };

  await createPost(session, post2Text, replyRef);

console.log(`Posted: ${ad.brandName} — ${ad.format}`);
  console.log(`Thread root: ${post1.uri}`);
  return post1.uri;
}