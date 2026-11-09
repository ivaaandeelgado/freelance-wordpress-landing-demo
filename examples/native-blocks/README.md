# Native WordPress editing example

A small variation of the fictional Luma concept, built with **36 WordPress core blocks** and the **Kadence theme 1.6.0**. It demonstrates ordinary editable content and a tablet-sized editing workflow. It does not use Elementor or the separate Kadence Blocks plugin.

[Open the browser demo](https://playground.wordpress.net/?mode=seamless&blueprint-url=https%3A%2F%2Fraw.githubusercontent.com%2Fivaaandeelgado%2Ffreelance-wordpress-landing-demo%2Fmain%2Fdocs%2Fnative-playground.json)

[Open with Playground controls](https://playground.wordpress.net/?blueprint-url=https%3A%2F%2Fraw.githubusercontent.com%2Fivaaandeelgado%2Ffreelance-wordpress-landing-demo%2Fmain%2Fdocs%2Fnative-playground.json) to visit `/wp-admin/` and edit the page. The synthetic account is `admin` / `local-demo-only`; the browser demo signs in automatically. Each visitor runs a separate browser sandbox. Do not use real personal data.

## Run locally

From the repository root, after `npm ci`:

```sh
npm run start:native
# Open http://127.0.0.1:9419
```

The runtime binds only to loopback. Stop it with Ctrl+C. Starting again recreates the demo from `content.html`.

In a second terminal, run `npm run check:native`. The check covers frontend navigation and FAQs, a 390px mobile layout, block validation, changing a heading through the editor at a touch-enabled tablet viewport, saving it, and checking the published result after reload. It restores the original text afterward. Reports and screenshots go to ignored `test-results/native/`.

The test uses Chrome on Windows with a tablet-sized touch emulation. **A physical iPad and Safari have not been verified.** Confirm that workflow on the intended device before committing to an iPad editing requirement. This example demonstrates the Kadence theme and core blocks; it does not establish experience with Kadence Blocks, Pro features or a complete client project.

## Content and limits

`content.html` was serialized by the running WordPress editor from registered core blocks, using the theme's actual color presets. `npm run build:native` packages that content into `docs/native-playground.json`.

All copy is fictional personal demo content created with AI assistance. There is no enquiry collection, payment flow, email delivery, analytics or customer data. The browser runtime needs internet access to download WordPress and the free theme initially; no production hosting is deployed.

See [the local editing verification](../../docs/native-editing-verification.json). The main repository's CI checks cover the Elementor example; this additional editing example has the separate checks described here.
