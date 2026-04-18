# MMM-AntiAd

A [MagicMirror²](https://magicmirror.builders/) module that generates absurdist advertisements from random Wikipedia article combinations using Claude AI.

## What It Does

Every 12 hours, the module:
1. Pulls two random Wikipedia articles
2. Selects a random ad format from 25 types (infomercial, luxury brand, legal disclaimer, unhinged Yelp review, etc.)
3. Generates a fake brand name and ad copy using Claude AI — written with complete sincerity in the tone of the selected format
4. Displays the result on your mirror

The humor comes from corporate earnestness applied to completely wrong subjects.

---

## Examples

> **Format:** Wellness brand
> **Brand:** Flemish Yoga Co.
> *"Your body deserves the ancient wisdom of the Flemish Parliament. Finally, a quorum you can achieve in downward dog."*

> **Format:** LinkedIn thought leadership
> **Brand:** Tidal Bore Capital
> *"Don't count your bore cycles before they crest — trust me, I turned a 4-metre tidal phenomenon into a 500m ARR business."*

---

## Requirements

- MagicMirror² installed and running
- Node.js 14+
- An [Anthropic API key](https://console.anthropic.com/)

---

## Installation

```bash