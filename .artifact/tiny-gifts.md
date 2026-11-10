---
title: Tiny Gifts
date: 2021-01
category: product
tags:
  - web
url: https://tiny.gifts
links:
  source: https://github.com/arfct/tiny.gifts
media:
  - src: card.png
    caption: The front of a card, with a note and the sender's name
    alt: A white card on a blue and green gradient with a short message about meeting at the park, signed Pistachio
  - src: create.png
    caption: The front page of the site, with its Create button
    alt: A small white card with a package icon, the line "Send messages, gift codes, and more with a tiny card." and a create button
icon_shape: none
unconfirmed:
  - date
---

tiny.gifts makes a small card that is sent as a link. The front of the card holds a note and the sender's name. The back can hold a description, a picture taken from the item's product page, a gift code with a Copy button and a link with a Get button. A click turns the card over. The background can be a color, an image or custom CSS.

The contents of a card are stored in its link. The names and the preview text are in the path. The note, the code and the link are base64-encoded in the fragment after the #, which a browser does not send to the server. The site has no accounts.

The first commit is from January 2021. The site moved from Firebase to Cloudflare Workers in 2026.

JavaScript, Mithril, Cloudflare Workers. 2021.
