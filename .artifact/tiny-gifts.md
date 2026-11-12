---
title: tiny.gifts
date: 2021-01
status: released
category: product
tags:
  - web
url: https://tiny.gifts
links:
  source: https://github.com/arfct/tiny.gifts
media:
  - src: card.png
    caption: The front of a card, where the note is followed by the sender's name
    alt: A white card over a blue and green gradient with large coral, pink and turquoise shapes, bearing a short message about meeting at the park, signed Pistachio
  - src: create.png
    caption: The site's front page, laid out as a card with a Create button
    alt: A small white card with a package icon, the line "Send messages, gift codes, and more with a tiny card." and a create button
icon_shape: none
unconfirmed: [date, status]
---

Both sides of a tiny.gifts card travel in a single link. The front, which the recipient sees first, carries a note and the sender's name. A click turns the card over, and it settles a few degrees off level, by a random amount of up to five. The back can hold a description, a picture taken from the item's product page, a gift code with a Copy button and a link with a Get button. Behind the card the sender may put a color, an image or custom CSS.

The names and the preview text are written in the path of the link. The note, the code and the gift's own link follow the #, in the part of an address that a browser does not send to a server, and the site has no accounts.

JavaScript, Mithril, Cloudflare Workers. 2021.
