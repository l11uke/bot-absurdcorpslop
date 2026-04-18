# MMM-AntiAd

A [MagicMirror²](https://magicmirror.builders/) module that generates absurdist advertisements from random Wikipedia article combinations using Claude AI.

## What It Does

Every 12 hours, the module:
1. Pulls two random Wikipedia articles
2. Selects a random ad format from 25 types
3. Generates a fake brand name, headline, and body copy using Claude AI — written with complete sincerity in the tone of the selected format
4. Finds a relevant image from Unsplash
5. Displays the result on your mirror

The humor comes from corporate earnestness applied to completely wrong subjects.

---

## Examples

**Format:** LinkedIn thought leadership
**Brand:** Trent & Bombardier Advisory Group
*Don't let your defensive mechanisms calcify before the doctrine does.*

> Most people are watching three synods collapse because leadership refused to iterate. At Trent & Bombardier, we've spent fourteen years helping organisations secrete precisely the right chemical response at precisely the right moment. The church didn't reform itself by being comfortable. Neither will you.

---

**Format:** Wellness brand
**Brand:** SurveyNourish
*Your body deserves a precise understanding of its own terrain.*

> Most people are consuming at scale without ever mapping the consequences — SurveyNourish exists because your digestive grid has boundaries, and someone needs to draw them. Our 12-week programme triangulates your intake with the same rigour the British countryside deserves.

---

**Format:** Classified ad
**Brand:** MeroGlide
*FOR SALE: One careful owner.*

> MeroGlide slip-ons, barely worn, direct lineage to the founding footwear of the Frankish royal court — or near enough. These aren't shoes, they're succession. Serious inquiries only, no time wasters, collection preferred, will not post.

---

## Requirements

- MagicMirror² installed and running
- Node.js 14+
- An [Anthropic API key](https://console.anthropic.com/)
- An [Unsplash API key](https://unsplash.com/developers)

---

## Installation

```bash
cd ~/MagicMirror/modules
git clone https://github.com/l11uke/MMM-AntiAd.git
cd MMM-AntiAd
npm install
```

Set your API keys as environment variables:

```bash
export ANTHROPIC_API_KEY=your_anthropic_key_here
export UNSPLASH_ACCESS_KEY=your_unsplash_key_here
```

To make them permanent, add those lines to your `~/.bashrc` or `~/.profile`.

---

## Configuration

Add to your `config/config.js`:

```javascript
{
  module: "MMM-AntiAd",
  position: "bottom_left",
  config: {
    updateInterval: 12 * 60 * 60 * 1000  // 12 hours in milliseconds
  }
}
```

---

## Ad Formats

The module randomly selects from 25 formats including:

Infomercial, Luxury brand, Tech startup, Government PSA, Late night TV, Wellness brand, Financial product, Political campaign, Legal disclaimer, Academic abstract, Dating profile, Real estate listing, Job posting, Warning label, Obituary as ad, TripAdvisor review, LinkedIn thought leadership, Kickstarter pitch, Supermarket bundle, Insurance claim, Classified ad, Church bulletin, Pyramid scheme, Caution label, Unhinged Yelp review.

---

## Cost

- Claude Haiku — approximately $0.0002 per generation
- Unsplash — free tier allows 50 requests per hour

At 12-hour intervals that's roughly $0.12/month in API costs.

---

## License

MIT