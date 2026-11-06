# Character color references

One recipe per character supplies all modes and appearances. These are authored
UI adaptations of specific visual references, not official or sampled costume hex codes.
Light/Dark solve tone from the same colors. Monochrome intentionally reduces the
scheme, and bichrome derives its third hue; neither adds a separate outfit palette.

| Preset | Chosen reference | Signature colors | Recommended look |
|---|---|---|---|
| `batman` | [Black-and-yellow Bat-Symbol](https://shop.dc.com/products/batman-logo-embroidered-patch) | yellow, neutral, neutral; neutral ground | dark · bichrome |
| `black-panther` | [T’Challa’s black suit and violet vibranium energy](https://www.marvel.com/articles/movies/how-the-costumes-of-black-panther-brought-the-world-of-wakanda-to-life) | violet, neutral, neutral; neutral ground | dark · bichrome |
| `black-widow` | [Black tactical suit, scarlet hourglass and copper-red hair](https://www.marvel.com/characters/black-widow-natasha-romanova/in-comics) | red, rust, neutral; neutral ground | dark · trichrome |
| `blue-pink-neon` | [Ranveer’s original](https://github.com/bluepinkneon/buzz-chroma/blob/main/ALGORITHM.md) | blue, pink, teal; violet ground | dark · trichrome |
| `chun-li` | [Classic blue qipao, gold trim and white boots](https://game.capcom.com/cfn/sfv/character/chun-li/costume?lang=en) | blue, yellow, neutral; blue ground | light · trichrome |
| `daredevil` | [Classic red suit](https://www.marvel.com/articles/gear/the-design-elements-at-work-in-sideshow-collectibles-daredevil-sixth-scale-figure) | red, neutral, neutral; red ground | dark · monochrome |
| `darth-vader` | [Black armor, red saber and silver highlights](https://www.starwars.com/news/15-of-the-scariest-star-wars-villains) | red, neutral, neutral; neutral ground | dark · trichrome |
| `deadpool` | [Red suit panels, black gear, white lenses](https://www.marvel.com/articles/gear/dc-shoes-offbeat-deadpool-collection) | red, neutral, neutral; red ground | dark · trichrome |
| `doctor-strange` | [Blue tunic, red cloak and golden amulet](https://www.marvel.com/characters/doctor-strange-stephen-strange/on-screen) | blue, red, yellow; blue ground | dark · trichrome |
| `ezio-auditore` | [Brotherhood white robes, silver armor and red sash](https://www.ubisoft.com/en-us/game/assassins-creed/the-ezio-collection) | red, neutral, neutral; neutral ground | light · bichrome |
| `gandalf` | [Gandalf the Grey, wooden staff and silver hair](https://www.wetanz.com/uk/gandalf-the-grey-wizard) | neutral, sepia, neutral; neutral ground | dark · trichrome |
| `harley-quinn` | [Modern pink/blue hair, pale makeup and black stagewear](https://www.dc.com/blog/2024/02/12/a-dangerous-desire-could-the-joker-and-harley-ever-work) | pink, blue, neutral; neutral ground | light · trichrome |
| `hermione-granger` | [Black school robes and Gryffindor scarlet/gold](https://www.harrypotter.com/house/gryffindor) | red, yellow, neutral; neutral ground | dark · trichrome |
| `john-wick` | [Chapter 4 black tailoring and violet/blue night lighting](https://www.lionsgate.com/movies/john-wick-chapter-4) | violet, blue, neutral; neutral ground | dark · trichrome |
| `joker` | [Classic purple suit, green hair, white face](https://www.dc.com/blog/2021/09/24/laughing-in-fear-twelve-moments-that-defined-the-joker) | violet, green, neutral; violet ground | dark · trichrome |
| `lara-croft` | [Classic teal top and brown leather](https://www.tombraider.com/news/cosplay/tomb-raider-ii-cosplay-guides) | teal, sepia, neutral; teal ground | auto · trichrome |
| `link` | [Classic green tunic, brown boots and white undershirt](https://www.nintendo.com/us/amiibo/detail/toon-link-the-wind-waker-amiibo-30th-anniversary-series/) | green, sepia, neutral; green ground | light · trichrome |
| `miyamoto-musashi` | [Musashi’s ink-wash painting, paper and wood](https://www.shimada-museum.net/eng.html) | neutral, sepia, neutral; neutral ground | light · trichrome |
| `neo` | [The Matrix black leather and phosphor-green code](https://wbshop.com/collections/the-matrix) | green, neutral, green; green ground | dark · monochrome |
| `princess-leia` | [A New Hope white gown and silver belt](https://www.starwars.com/news/from-a-certain-point-of-view-who-is-the-galaxys-best-dressed) | neutral, neutral, neutral; neutral ground | light · monochrome |
| `samus-aran` | [Classic Varia suit: orange, red and green](https://www.nintendo.com/us/store/products/metroid-duffel-bag-126914/) | rust, red, green; rust ground | dark · trichrome |
| `sekiro` | [Wolf’s rust coat, charcoal wraps and steel blade](https://www.sekirothegame.com/) | rust, neutral, neutral; rust ground | dark · trichrome |
| `sherlock-holmes` | [Victorian ink and sepia print interpretation](https://www.gutenberg.org/cache/epub/66991/pg66991-images.html) | sepia, neutral, neutral; sepia ground | light · monochrome |
| `spider-man` | [Classic red-and-blue suit with white eye lenses](https://www.marvel.com/articles/comics/which-spider-man-suit-best-fits-your-mood) | red, blue, neutral; red ground | dark · trichrome |
| `superman` | [Classic blue uniform, red cape, yellow shield](https://www.dc.com/characters/superman) | blue, red, yellow; blue ground | light · trichrome |
| `wolverine` | [Classic yellow-and-blue suit with red belt](https://www.marvel.com/articles/comics/wolverine-logan-james-howlett-every-costume-list) | yellow, blue, red; yellow ground | dark · trichrome |
| `wonder-woman` | [Classic red, blue and gold uniform](https://www.dc.com/characters/wonder-woman) | red, yellow, blue; red ground | dark · trichrome |
| `zelda` | [The Wind Waker pink-and-white royal dress and gold](https://www.nintendo.com/us/amiibo/detail/toon-zelda-the-wind-waker-amiibo-30th-anniversary-series/) | pink, yellow, neutral; neutral ground | light · trichrome |

Neutral seeds keep white, silver and charcoal neutral rather than forcing an
unrelated third hue into body text. In neutral-ground recipes the Primary accent
remains visible on actions and links while the larger reading surfaces stay gray.
John Wick’s violet/blue references Chapter 4 lighting; Sherlock’s sepia references
Victorian print; Musashi’s paper/ink/wood references his brushwork, not an invented
costume. Harley Quinn uses the modern pink/blue interpretation.

`test/character-identities.json` records these independent color-family briefs.
Tests check the emitted Primary action, Secondary own-message surface, Neon metadata
ink and reading ground against those families in both polarities. Contrast and
component-state tests still run separately over the full role graph. Gaia and Lima
also review rendered looks; numeric contrast alone does not decide character fidelity.

The highest-fidelity default is the recommended look. Shared monochrome reductions
are allowed: two characters whose signature includes the same red can have the same
one-hue variant. Primary color rotation is an intentional customization, not a claim
that a rotated outfit remains canonical.
