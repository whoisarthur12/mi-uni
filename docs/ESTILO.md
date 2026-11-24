# ESTILO — referencia visual del dueño

> **Nota del proyecto (24-nov-2026):** documento de referencia aportado por el dueño. Describe el sistema visual de una web de marketing de terceros. **No se copian** su marca, nombres, logos, textos, imágenes ni afirmaciones. Mi Uni lo **adapta** a una app según [ADR-013](decisions/ADR-013-sistema-visual.md): qué se usa, qué no y qué cambia (colores AA, áreas táctiles de 44 px, tema oscuro cálido, Inter local). Si este documento y ADR-013 discrepan, manda ADR-013.

---

# Cursor — painted desktop workbench

## Overview

A warm, light technical style that feels more like a working desktop in an art book than a software advertisement. Cream and putty surfaces, brown-black text and tiny orange links surround unusually tangible interface demonstrations, often backed by faded landscape paintings. Regular-weight grotesk typography and compact card interiors balance broad, unhurried section spacing. It suits tools whose actual workflows can carry the persuasion.

### Essentials

- The product is bigger than the promise: a left-aligned 26px/1.25 regular headline precedes paired 43px pills and a 1300×720px demonstration stage; the opening is not a giant slogan.
- A desktop sits inside a painting: cream application windows with 10px corners and broad soft shadows overlap within a 4px-cornered landscape-backed frame. Include this tactile product stage; without application media, construct a credible working document or workflow panel on a muted textured landscape.
- The palette behaves like warm stationery: #f7f7f4 canvas, #f2f1ed cards and #26251e ink occupy nearly all the page; #f54e00 is confined to small directional links, with richer color contained inside media.
- Headings speak at conversational volume until the farewell: 22px feature copy and 26px section pairs stay regular-weight; a centered 72px/1.1 closing line supplies the dramatic scale change.
- Rounded actions meet almost-square furniture: 9999px button radii contrast with 4px marketing cards, 10px grid gutters and 17.5px card insets.
- Proof is arranged as a specimen collection: monochrome marks in 154×100px tiles, then three-column quote cards with 16px/1.5 text and small portrait attributions rather than oversized quotation marks.

## Colors

### Accent

| Name | Value | Token | Roles | Use |
| --- | --- | --- | --- | --- |
| Burnt orange | `#f54e00` | `--color-accent` | link, accent | Small directional text links; not a page-sized background. |

### Neutral

| Name | Value | Token | Roles | Use |
| --- | --- | --- | --- | --- |
| Warm paper | `#f7f7f4` | `--color-canvas` | background, text | Main canvas and reversed primary-action text. |
| Barely painted edge | `#f2f2ef` | `--color-faint-edge` | border | Visible 2.5% ink edge on paper, most apparent around secondary actions. |
| Pale putty | `#f2f1ed` | `--color-card` | surface, background | Marketing cards, footer and question bands; also application chrome. |
| Inset putty | `#ebeae5` | `--color-inset` | surface | Inset panels, editorial rows and comparison emphasis. |
| Control grey | `#e6e5e0` | `--color-control` | surface, action | Secondary pills and small demonstration backings. |
| Fine rule | `#e2e2df` | `--color-rule` | border | Visible 10% ink rule on paper; use rgba(38,37,30,0.1) to preserve the relationship on tinted bands. |
| Warm stone stage | `#d9d5cf` | `--color-warm-stage` | surface | Flat backing behind large interface demonstrations. |
| Pill outline | `#cdcdc9` | `--color-outline` | border | Visible 20% ink outline for small outlined actions. |
| Deep stone stage | `#cac6be` | `--color-phone-stage` | surface | Backing behind the cropped mobile-device demonstration. |
| Blue grey stage | `#b6b9be` | `--color-cool-stage` | surface | Cooler contrasting backing for selected interface scenes. |
| Warm grey text | `#7a7974` | `--color-secondary-text` | text | Visible secondary ink on paper; implemented as 60% #26251e, which changes slightly with the backing. |
| Brown black | `#26251e` | `--color-ink` | text, action | Primary headings, body text and filled primary actions. |

### Page-type variants

| Only for | Name | Value | Token | Roles | Use |
| --- | --- | --- | --- | --- | --- |
| detailed product pages | Grey sage stage | `#cfcebc` | `--color-sage-stage` | surface | Flat sage backing for the detailed product opening and selected demonstration panels. |

## Typography

- **CursorGothic** — All marketing headings, paragraphs, navigation, labels and actions. Compact, open grotesk with a practical, non-geometric warmth; overwhelmingly regular-weight. If unavailable, use **Inter**. Use 400 for nearly everything; preserve tight heading tracking. Font stack: "CursorGothic", "Inter", system-ui, "Helvetica Neue", Helvetica, Arial, sans-serif.

| Recipe | Font | Weight | Size | Line height | Tracking | Use |
| --- | --- | --- | --- | --- | --- | --- |
| closing | CursorGothic | 400 | 72px | 1.1 | -0.03em | Short centered closing call, the largest marketing typography. |
| heading | CursorGothic | 400 | 36px | 1.2 | -0.02em | Centered proof headings; also product and business introduction heading pairs. |
| opening | CursorGothic | 400 | 26px | 1.25 | -0.0125em | Default landing headline and section heading pairs; secondary sentence uses the same recipe with 60% ink. |
| feature-lead | CursorGothic | 400 | 22px | 1.3 | -0.005em | Large split-panel feature heading and its muted supporting sentence; also small section titles. |
| body | CursorGothic | 400 | 16px | 1.5 | 0.005em | Card titles, descriptions, testimonials and orange text links; hierarchy is primarily color rather than weight. |
| button | CursorGothic | 400 | 16px | 1 | normal | Main 43px pill actions. |
| small | CursorGothic | 400 | 14px | 1.5 | 0.01em | Logo-strip captions, testimonial attributions and footer columns. |
| navigation | CursorGothic | 400 | 14px | 1.5 | normal | Desktop navigation items. |

### Page-type variants

| Only for | Recipe | Font | Weight | Size | Line height | Tracking | Use |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pricing and business pages | business-display | CursorGothic | 400 | 52px | 1.15 | -0.025em | Business closing calls, pricing title and standalone proof numbers. |
| team-plan comparisons | comparison-heading | CursorGothic | 500 | 26px | 1.25 | -0.0125em | Two-column purchase comparison headings; the rare medium-weight exception. |
| pricing and business pages | answer | CursorGothic | 400 | 16px | 1.5 | normal | Question rows and expanded answer copy. |

**Notes:**

- Keep the headline and its following support sentence at identical size and weight; shift the support sentence to 60% ink instead of shrinking it.
- Tracking tightens with scale: slightly positive at 14–16px, nearly neutral at 22px, then -0.0125em at 26px through -0.03em at 72px.
- Sentence case, regular weight and natural wrapping are central. Serif and monospace faces belong within demonstrations, not the marketing hierarchy.

## Layout

**Density:** Airy between chapters, compact within cards and interface scenes; wide media carries more area than prose.

### Spacing

**Spacing system:**

- **vertical rhythm** 22.4px, vertical — Section and text-stack rhythm, with half and quarter multiples.
- **horizontal step** 10px, horizontal — Grid gutters, action gaps and their multiples or subdivisions.

| Value | Use |
| --- | --- |
| 10px | Grid gutters and adjacent action spacing. |
| 17.5px | Large card and media inset; 1.75 horizontal steps. |
| 20px | Outer section side padding and comparison-card padding. |
| 22.4px | One rhythm between heading and action. |
| 44.8px (2 × 22.4px) | Two rhythms for larger stack gaps. |
| 56px | 2.5 rhythms from opening actions to media or proof heading to cards. |
| 67.2px (3 × 22.4px) | Three rhythms of ordinary section padding. |
| 89.6px (4 × 22.4px) | Four rhythms separating large feature panels or padding a dense question band. |
| 112px (5 × 22.4px) | Five rhythms above an opening headline. |
| 134.4px (6 × 22.4px) | Six rhythms of closing-call breathing room. |

### Containers and grids

- **main container**: max width 1300px · side padding 20px. Centered shared alignment across navigation, hero media, cards and footer; at 1440px this leaves 70px side margins.
- **prose**: max width 658px. Opening copy and narrow text stacks; do not spread a short promise across the full canvas.
- **centered headline**: max width 810px. Centered proof and closing headings.
- **feature stage**: 24 columns · gap 10px. Large split cards give roughly one third to copy and two thirds to a framed demonstration; reverse the visual side between chapters.
- **card grid**: 3 columns · gap 10px. Equal-width feature and quote cards; four columns serve compact news or multi-surface collections.
- **footer columns**: 5 columns · gap 10px. Even navigation columns on a full-width putty band.
- **question split** (only for pricing and business pages): 2 columns · gap 0px. A heading in the left half and a 650px accordion in the right half.

## Corner radius

| Only for | Element | Radius |
| --- | --- | --- |
|  | marketing cards | 4px |
|  | actions | 9999px (pill) |
| product demonstrations | application windows | 10px |

## Surfaces and depth

### Shadows

| Only for | Name | Value | Use |
| --- | --- | --- | --- |
| product demonstrations | application window | `0px 28px 70px 0px rgba(0,0,0,0.14), 0px 14px 32px 0px rgba(0,0,0,0.1), 0px 0px 0px 1px rgba(38,37,30,0.1)` | Floating application windows, not marketing cards. |

### Surfaces

#### Paper canvas · level 0

**Use:** Default marketing background.

**CSS:** `background: #f7f7f4; color: #26251e`

**Observed:** Warm off-white continues through the fixed header and most sections.

**Transfer:** Let the product stages and small surface changes create structure.

#### Putty card · level 1

**Use:** Shared marketing-card material.

**CSS:** `background: #f2f1ed; border-radius: 4px; box-shadow: none`

**Observed:** Almost flat, with an extremely faint pale overlay edge rather than a conspicuous outline.

**Transfer:** Use the same material for quotes, logos, features and news; vary composition rather than decoration.

#### Putty band · level 0

**Use:** Footer and question sections.

**CSS:** `background: #f2f1ed`

**Observed:** Full-bleed tonal shift with square band edges; no dark ending.

**Transfer:** Separate information-heavy support material from the paper chapters.

#### Stone media stage · level 1

**Use:** Backing for interface scenes.

**CSS:** `background: #d9d5cf; border-radius: 4px; overflow: hidden`

**Observed:** Alternates warm stone, cool blue grey and painterly landscapes; color is contained inside the media boundary.

**Transfer:** Choose one subdued backing per scene rather than tinting the whole section.

#### Floating window · level 2

**Only for:** product demonstrations

**Use:** Tangible working software or document panel.

**CSS:** `background: #f2f1ed; border-radius: 10px; overflow: hidden; box-shadow: 0px 28px 70px 0px rgba(0,0,0,0.14), 0px 14px 32px 0px rgba(0,0,0,0.1), 0px 0px 0px 1px rgba(38,37,30,0.1)`

**Observed:** Cream chrome with thin divisions, restrained title bars and overlapping foreground windows.

**Transfer:** Keep the window content legible enough to communicate a real workflow.

## Components

### Desktop navigation

**Use:** Persistent site orientation.

**CSS:** `height: 52px; background: #f7f7f4; position: fixed; top: 0px; width: 100%; z-index: 50`

**Text style:** `navigation` — CursorGothic 400 · 14px/1.5

**Observed:** Small wordmark left, centered navigation, sign-in and two compact pills right. Navigation items use 5.6px vertical and 15px horizontal padding; compact actions are 27px tall.

**States:** Declared: hover navigation color color-mix(in oklab, #edecec 75%, transparent); focus-visible outline 2px solid #edecec with outline-offset 0.3ch.

### Primary button

**Use:** Main conversion action.

**CSS:** `display: inline-flex; align-items: center; justify-content: center; background: #26251e; color: #f7f7f4; border: 1px solid #26251e; border-radius: 9999px; padding: 12.5px 21.6px 12.8px; height: 43px`

**Text style:** `button` — CursorGothic 400 · 16px/1

**Observed:** Text followed by a small download or right-arrow symbol; width follows content. Compact header versions use 14px text and 5.6px top, 10.5px side, 5.9px bottom padding.

**States:** Declared: hover background and border #d7d6d5, text #14120b; focus-visible outline 2px solid #edecec with outline-offset 0.3ch; active background #edecec.

### Secondary button

**Use:** A lower-emphasis route beside the primary action.

**CSS:** `display: inline-flex; align-items: center; justify-content: center; background: #e6e5e0; color: #26251e; border: 1px solid rgba(38,37,30,0.025); border-radius: 9999px; padding: 12.5px 21.6px 12.8px; height: 43px`

**Text style:** `button` — CursorGothic 400 · 16px/1

**Observed:** Same silhouette as the primary action; paired across a 10px gap. Header contact uses an unfilled 20% ink outline instead.

**States:** Declared: hover background #2b2923 and text #edecec; focus-visible outline 2px solid #edecec with outline-offset 0.3ch; active background #26241e.

### Directional link

**Use:** Feature exploration, editorial collections and secondary paths.

**CSS:** `display: inline-flex; align-items: center; color: #f54e00`

**Text style:** `body` — CursorGothic 400 · 16px/1.5 · tracking 0.005em

**Observed:** No box or filled backing; arrow is inline at the end, diagonal for outbound destinations. Usually separated from description by 14.9px.

**States:** Declared: hover color color-mix(in oklab, #f54e00 75%, transparent); focus-visible outline 2px solid #edecec with outline-offset 0.3ch.

### Feature card

**Use:** Short capability statement paired with a large demonstration.

**CSS:** `display: flex; flex-direction: column; background: #f2f1ed; border-radius: 4px; padding: 15.9px 17.5px 17.5px`

**Text style:** `body` — CursorGothic 400 · 16px/1.5 · tracking 0.005em

**Observed:** Dark title, muted description, orange Directional link, then a nearly square inset media panel; equal-height cards align across a row. Three-column versions are about 427px wide and 540–553px tall.

**Transfer:** One capability per card; show a small meaningful piece of the workflow rather than a decorative icon.

### Quote card

**Use:** Credible user proof in a dense collection.

**CSS:** `display: flex; flex-direction: column; background: #f2f1ed; border-radius: 4px; padding: 15.9px 17.5px 17.5px`

**Text style:** `body` — CursorGothic 400 · 16px/1.5 · tracking 0.005em

**Observed:** Quote occupies the top; a small circular portrait and two-line name/title attribution sit at the bottom. Business versions add a monochrome company mark above the quote. Heights follow row content rather than huge quotation typography.

**Transfer:** Use genuine quotes with specific effects on the user's work.

### Logo tile

**Use:** Compact social-proof strip.

**CSS:** `display: flex; align-items: center; justify-content: center; height: 100px; padding: 0px 7.5px; background: #f2f1ed; border-radius: 4px`

**Observed:** Eight equal tiles in one desktop row; marks are dark monochrome with a maximum visual height around 40px, not colorful badges.

**Transfer:** Equalize optical logo size; a business credibility strip can use two rows.

### Footer link

**Use:** Secondary site navigation.

**CSS:** `display: inline-block; color: #26251e; padding: 4.7px 0px`

**Text style:** `small` — CursorGothic 400 · 14px/1.5 · tracking 0.01em

**Observed:** Five columns headed in muted text. A low utility row carries copyright and certification at left and small theme and language pills at right.

**States:** Declared: hover color #edecec; focus-visible outline 2px solid #edecec with outline-offset 0.3ch.

### Question row

**Only for:** pricing and business pages

**Use:** Objection handling in the right half of a tonal band.

**CSS:** `display: flex; justify-content: space-between; align-items: center; padding: 15.7px 0px 16.8px; border-top: 1px solid rgba(38,37,30,0.1); color: #26251e`

**Text style:** `answer` — CursorGothic 400 · 16px/1.5

**Observed:** A full-width question button with a small downward chevron at the far right; last row adds a bottom rule. Closed rows are about 57px tall; answers expand below the label without changing material.

**Transfer:** Use a real accordion and concise practical questions.

### Plan card

**Only for:** pricing pages

**Use:** Comparable purchase choices.

**CSS:** `background: #f2f1ed; border-radius: 4px; padding: 13.4px 15px 15px`

**Text style:** `body` — CursorGothic 400 · 16px/1.5 · tracking 0.005em

**Observed:** Four desktop columns: 22px plan title, 36px price with small monthly unit, full-width pill, then grouped benefits and thin rules. Only the promoted tier uses a dark pill and a small orange-tinted recommendation label.

**Transfer:** Keep feature groups aligned and express differences without colorful card borders.

### Stat card

**Only for:** business proof sections

**Use:** Standalone quantified proof.

**CSS:** `display: grid; background: #f2f1ed; border-radius: 4px; padding: 12.5px 15px 15px`

**Text style:** `business-display` — CursorGothic 400 · 52px/1.15 · tracking -0.025em

**Observed:** Three 427×251px cards: large regular-weight number near the top left, short 16px explanation near the bottom, substantial empty space between. Numbers stay ink-colored.

**Transfer:** Use independently supportable metrics and keep units attached to the number.

## Imagery and graphics

### Painted workbench

**Use:** Signature large product stage in the opening and selected capability panels.

**Observed:** Faded scenic paintings of lakes, mountains, trees and pale skies sit behind floating cream desktop windows. Muted sage, dusty mauve, ochre and grey-blue provide atmosphere without competing with the interface; a smaller terminal window overlaps the main window near the lower right. The media is much larger than the associated text.

**Transfer:** Show the new product's actual working surface on an original or suitably licensed low-contrast landscape. If no interface exists, use a carefully composed working document or result panel, not an empty rectangle.

**Build:** Use a 1300×720px relative frame with 4px corners. Fill it with a desaturated landscape; for an artwork-free minimum, draw broad SVG hill silhouettes in rgba(38,37,30,0.12) and rgba(38,37,30,0.06) over #d9d5cf, with a low horizon and a pale sky. Add SVG fractal-noise grain at about 0.08 opacity and keep contrast subdued. Center a 1080×620px cream window with the Floating window surface and overlap a roughly 480px-wide secondary window at its lower right. These landscape-shape settings are a construction recommendation.

### Inset workflow vignettes

**Use:** Media inside feature grids.

**Observed:** Cropped menus, short task lists, prompt panels, terminal output and a partly visible phone sit on flat stone, sage or blue-grey fields. The visual explains one action, not the whole application. Window edges sometimes extend past the frame.

**Transfer:** Reduce each capability to a small real interaction. Preserve compact UI density and the generous blank backing around it.

### Human working photography

**Use:** A human counterpoint within a large split panel.

**Observed:** Candid people collaborating at a glass board, viewed through foreground plants and softly blurred shoulders; natural window light, muted green and warm brown, shallow depth of field. A smaller card shows someone facing bright code monitors.

**Transfer:** Photograph people actually using the product or doing the work it supports; favor layered environmental views over isolated studio portraits.

### Resource thumbnail set

**Only for:** resource collections on business pages

**Use:** Compact editorial previews above titles, descriptions and dates.

**Observed:** A mixture of spare technical line art on dark grey, a cream code-document panel, and a small prompt on black; approximately 397×208px thumbnails. Dark fills remain bounded by the thumbnail.

**Transfer:** Give each resource a simple content-specific diagram or panel, retaining this varied but low-saturation treatment.

### Icons

**Observed:** Marketing actions favor inline arrows and a download glyph rather than large icon badges. Most small interface symbols are filled SVGs at 12–16px in ink or muted ink; business comparison checks use 14px rounded strokes.

**Transfer:** Use small optically aligned symbols and monochrome marks. Keep multi-color tool logos confined to workflow media.

## Section recipes

How recurring sections are built.

### First screen: Workbench opening

**Observed:** The Paper canvas and fixed 52px Desktop navigation establish the frame. After 112px of top padding, a left-aligned two-line 26px opening headline occupies only a modest part of a 658.3px text column, leaving broad empty space to its right. There is no separate supporting paragraph. Primary button and Secondary button follow after 22.4px. A 56px gap leads to the 1300×720px Painted workbench: scenic background, large cream application window, smaller overlapping foreground window. Within the first 900px the headline, both actions and most of the upper product scene are visible; the bottom of the scene and the logo strip fall below the fold.

**Transfer:** Keep this the default for a new landing page: a compact promise above an expansive tangible working scene. Use the painted-document construction when no application media exists. Detailed product pages open with a small category label and a 36px dark/muted heading pair above a sage stage; business pages use that heading-pair treatment followed directly by proof tiles. Pricing opens with a centered 52px title, a two-option pill switch and plan cards.

**Avoid:** Do not center a huge headline above a tiny dashboard, add a paragraph-heavy sales pitch, or place the headline over the scenic image.

**Text style:** `opening` — CursorGothic 400 · 26px/1.25 · tracking -0.0125em

### Alternating feature panel

**Observed:** A 1300px Putty card places about 383px of Feature-lead text beside an 840px-wide media area. Text is vertically centered, with a dark heading flowing directly into a muted explanation and a Directional link below. The frame has 17.5px insets; media and text reverse sides between chapters, with 89.6px separation.

**Transfer:** Let one concrete benefit accompany one large working scene; alternate the composition to maintain momentum.

**Text style:** `feature-lead` — CursorGothic 400 · 22px/1.3 · tracking -0.005em

### Heading pair and capability grid

**Observed:** A dark section heading and its muted continuation share the opening recipe, with no visible inter-paragraph gap. About 56px later, three Feature cards use 10px gutters; four narrower cards serve cross-surface collections. Each description stays above its inset media.

**Transfer:** Organize the product into understandable capability groups, keeping the text-to-media proportions stable.

**Text style:** `opening` — CursorGothic 400 · 26px/1.25 · tracking -0.0125em

### Proof collection

**Observed:** A centered 36px Heading precedes a three-column Quote card collection by 56px. Logo tiles form a separate compact proof strip with a centered 14px caption. Portrait and attribution stay small relative to the quote.

**Transfer:** Select proof that answers the promise and balance testimonial lengths by row.

**Text style:** `heading` — CursorGothic 400 · 36px/1.2 · tracking -0.02em

### Updates and editorial rows

**Observed:** Compact update cards use four columns, 10px gutters, 16px titles and muted dates, followed by a Directional link. An alternate editorial band places a small label at left and a 650px-wide stack of darker putty article rows to its right.

**Transfer:** Use release notes, learning material or other evidence that the product is actively improving.

**Text style:** `body` — CursorGothic 400 · 16px/1.5 · tracking 0.005em

### Monumental farewell and utility footer

**Observed:** A short centered 72px Closing line and one Primary button stand alone on Paper canvas, with 22.4px between them and 134.4px below. Business variants use the 52px Business-display recipe and can pair two pills. A 526px-tall Putty band footer follows, padded 67.2px above and 30px below, with five columns and a low utility row.

**Transfer:** Make the farewell dramatically larger than the opening promise and keep it free of new supporting claims. Retain the light footer even after information-heavy pages.

**Text style:** `closing` — CursorGothic 400 · 72px/1.1 · tracking -0.03em

### Business metric collection

**Only for:** business pages

**Observed:** A centered 36px heading introduces a three-column Stat card row with 10px gutters. Ink numbers use the 52px Business-display recipe, and captions sit low in each card.

**Transfer:** Translate evidence into a few distinct scale or outcome measures, without turning this into a bright analytics dashboard.

**Text style:** `business-display` — CursorGothic 400 · 52px/1.15 · tracking -0.025em

### Purchase comparison

**Only for:** team-plan comparisons

**Observed:** Two 645px-wide cards separated by 10px compare an individual approach and a shared approach. Both have 20px padding; the preferred side uses Inset putty. Medium-weight 26px headings precede aligned rows with muted markers on one side and orange checks on the other; a centered conversion pill follows.

**Transfer:** Contrast two purchase modes using parallel language and equal-length rows rather than a competitive scorecard.

**Text style:** `comparison-heading` — CursorGothic 500 · 26px/1.25 · tracking -0.0125em

### Questions band

**Only for:** pricing and business pages

**Observed:** Putty band with 67.2px or 89.6px vertical padding; a 36px title occupies the left half and stacked Question rows occupy the right. The closed list, not all answer paragraphs simultaneously, defines the resting composition.

**Transfer:** Resolve operational buying questions without decorative imagery.

**Text style:** `heading` — CursorGothic 400 · 36px/1.2 · tracking -0.02em

## Page flow

**Storyline:** Compact promise → tangible workflow → recognizable proof → capability depth → supporting evidence or buying detail → oversized invitation → utility navigation.

### General product marketing landing

1. **Promise and product demonstration** — Compact left headline, paired pills and expansive painted desktop.
2. **Social proof** — Monochrome logo tiles.
3. **Capability chapters** — Alternating large split panels.
4. **Credibility and exploration** — Quote collection, feature cards, updates and human working photography.
5. **Closing call** — Oversized centered invitation followed by the five-column tonal footer.

**Transfer:** Lead with the product's visible work; adapt the chapter count to the story.

### Plan selection and purchase comparison

1. **Pricing** — Centered title, individual/team switch and four plan cards.
2. **Decision support** — Long thin-ruled comparison matrix with persistent plan headings, small labels and checkmarks.
3. **Objection handling** — Split question band.
4. **Closing call** — 72px invitation with two action paths and the shared footer.

**Transfer:** Preserve detailed comparability while limiting emphasis to a single promoted plan.

### High-consideration organizational purchase

1. **Promise and social proof** — 36px dark/muted introduction, sales pill and two rows of logo tiles.
2. **Capability and user proof** — Large alternating workflow panels with compact inset quotes.
3. **Quantified proof** — Three spare number cards.
4. **Risk reduction** — Customization cards and compact security/service tiles.
5. **Customer evidence** — Logo-led quote cards and story cards.
6. **Objection handling and closing call** — Question band, 52px sales invitation and shared footer.

**Transfer:** Pair operational depth with recognizable proof rather than making the whole page more visually aggressive.

### Detailed capability education

1. **Promise and demonstration** — Category label, 36px heading pair and large sage desktop stage.
2. **Capability chapters** — Repeated 26px heading pairs above three- or four-column demonstrations.
3. **Social proof** — Centered heading with quote collection.
4. **Product momentum** — Editorial band and four-column update row.
5. **Closing call** — 72px invitation and shared footer.

**Transfer:** Use a consistent card grammar to explain many functions without changing the visual system each chapter.

### Shared-plan adoption for teams

1. **Promise and social proof** — Eyebrow, 36px heading pair, purchase pill and logo strip.
2. **Capability chapters** — Shared-workflow and cross-surface demonstration grids.
3. **Purchase rationale** — Two-column comparison of purchase modes.
4. **Credibility and risk reduction** — Quote grid, compact assurance tiles and resource thumbnails.
5. **Objection handling and closing call** — Question band, 52px paired-action invitation and shared footer.

**Transfer:** Explain the change in operating model before asking readers to select the shared plan.

## Writing

Matter-of-fact and ambitious, with confidence carried by specific work and outcomes rather than inflated adjectives. Technical detail is welcome when it explains a useful capability.

**Do not copy:** Do not reuse Cursor or related product names, wordmarks, customer logos, artwork, quotations, pricing, certifications, adoption figures or performance claims. Replace them with the new product's own substantiated content. The examples below show the pattern only; write new copy for the new product.

- **Addressing the reader:** Use you and your for the user's work; name the product when describing what it does. Use we sparingly for organizational statements.
- **Rhythm:** Short sentence-case headings, usually followed by one explanatory sentence. Adjacent heading and support often read as one continuous thought. Actions are short verbs, and questions are practical.

| Role | Pattern | Typical length | Examples of the pattern |
| --- | --- | --- | --- |
| Opening promise | Name the product's role and the ambitious work it enables. | 6–12 words | “[Brand] is your coding agent for building ambitious software.”<br>“Turn ideas into code” |
| Feature heading | An active statement about a concrete mode of work. | 4–8 words | “Works autonomously, runs in parallel”<br>“In every tool, at every step” |
| Support | Explain what happens and what the user can focus on instead. | One sentence, usually 12–25 words | “Accelerate development by handing off tasks to [Brand], while you focus on making decisions.” |
| Action | Direct verb and destination or outcome, with an inline arrow where useful. | 2–5 words | “Download for macOS”<br>“Read about our security” |
| Closing call | Unqualified invitation to begin, ending with a period. | 3–7 words | “Try [Brand] now.” |
| Question | A buyer's concrete operational concern. | 5–12 words | “How does billing work?” |

**Words and phrasing to use:** build; work; focus; ambitious; tools; control; shared; learn; review; end to end

**Avoid:** revolutionary; magical; unleash; game-changing; supercharge everything; excessive exclamation marks

**Rules:**

- Describe a visible action before making an abstract benefit claim.
- Keep card title and explanation distinct through meaning and color, not emphatic punctuation.
- Let testimonials carry enthusiasm; keep the surrounding narration composed.
- Use precise operational nouns appropriate to the new product, without forcing developer terminology into unrelated markets.

## Do's and Don'ts

### Do

- Keep the default opening at 26px and reserve 72px for the closing invitation.
- Use 10px gutters even when cards are very large.
- Carry the 22.4px vertical rhythm through headline/action stacks and 67.2px section padding.
- Frame substantive product scenes with 4px corners and floating 10px windows.
- Use 60% ink for the continuation of a heading pair.
- Confine vivid orange to short links and tiny comparison markers.
- Bottom-align compact attributions in quote cards.
- End with a light five-column footer and a restrained utility row.

### Don't

- Do not replace the warm paper #f7f7f4 with pure white throughout.
- Do not turn ordinary 4px marketing cards into deeply rounded 24px tiles.
- Do not add drop shadows to every marketing card; elevation belongs to application windows.
- Do not make all headings bold; 400 is the marketing default.
- Do not use orange as the main filled conversion button.
- Do not render the comparison matrix as a collection of floating cards; keep thin horizontal rules and aligned columns.
- Do not enlarge testimonial quotations to display size or decorate them with giant quote glyphs.
- Do not let dark resource thumbnails become a dark page theme.

## Motion and responsive

### Motion

**Observed:**

- Declared action transitions include color and background changes at 0.15s cubic-bezier(.4,0,.2,1).
- Demonstration interfaces declare 2.5s linear infinite shimmer, 1s linear infinite spinners and 3.1s ease-in-out working-opacity sequences.

**Transfer:**

- Use the short color transitions for controls; reserve ongoing activity motion for the working interface scene rather than marketing headings.

**Unknown:**

- Exact autoplay sequence, interaction triggers and reduced-motion behavior are not established.

### Responsive

**Observed:**

- Declared widths include 640px, 768px, 1024px and 1280px among additional component-specific breakpoints.
- Grid classes specify single-column cards expanding to two and three columns; footer classes specify two columns expanding to five. Main feature copy is stacked with media below at narrower widths.

**Transfer:**

- Stack the text before its product scene on narrow screens and retain the 4px outer frame.
- Reduce grid columns without expanding the 10px gutter; keep portrait attribution and article metadata attached to their cards.
- Adapt the overlapping desktop scene as one coherent scaled composition or a focused legible workflow panel rather than squeezing full desktop text into a narrow screen.

**Unknown:**

- Exact mobile header behavior, final mobile type sizes and all breakpoint-specific media transformations are not established.

## How to use this guide

1. Start from the Essentials and the first-screen recipe; where the guide offers variants, use the default named for a new marketing page.
2. Plan the page before building: map your content onto the section recipes and page flow, then check the plan against the Do's and Don'ts.
3. Build with the tokens and component specs; recreate signature graphics with their build recipes instead of generic decoration, and use the named font substitutes if a font is unavailable.
4. Render the page at desktop and mobile widths, compare it with the Essentials and the Don'ts, and fix the differences before you finish.
