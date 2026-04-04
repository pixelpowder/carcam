import pdfplumber
from pypdf import PdfReader, PdfWriter
from pypdf.generic import (
    ArrayObject, DictionaryObject, FloatObject, NameObject,
    TextStringObject, NumberObject
)
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import stringWidth
from io import BytesIO

INPUT = 'C:/Users/Pixelpowder/Downloads/kotor-visitor-guide.pdf'
OUTPUT = 'C:/Users/Pixelpowder/Downloads/kotor-visitor-guide-updated.pdf'
PAGE_H = 841.8898
BASE = 'https://www.kotordirectory.com'

pdfmetrics.registerFont(TTFont('Carlito-Bold', 'C:/Windows/Fonts/Carlito-Bold.ttf'))

# All verified sitemap URLs mapped by search words per page
# Format: { page_index: [ ([words_to_match], url, first_only), ... ] }
# first_only=True means only link the first occurrence on that page
page_links = {
    # Page 4 (index 3) - Itinerary
    3: [
        (["St.", "Tryphon\u2019s", "Cathedral"], BASE + '/listing/saint-tryphons-cathedral/'),
        (['Cat', 'Museum'], BASE + '/listing/kotor-cats-museum/'),
    ],
    # Page 5 (index 4) - Finding Your Way / Map landmarks
    # NB: page 5 uses straight apostrophes (0x27), not curly quotes
    4: [
        (['Sea', 'Gate'], BASE + '/listing/kotor-sea-gate/'),
        (['Arms', 'Square'], BASE + '/listing/square-of-arms/'),
        (["St.", "Tryphon's", "Cathedral"], BASE + '/listing/saint-tryphons-cathedral/'),
        (["St.", "Luke's", "Church"], BASE + '/listing/saint-lukes-church/'),
        (['Cat', 'Museum'], BASE + '/listing/kotor-cats-museum/'),
        (['Maritime', 'Museum'], BASE + '/listing/maritime-museum/'),
        (['North', 'Gate'], BASE + '/listing/river-gate-north-gate/'),
        (['Old', 'Town', 'Walls'], BASE + '/listing/kotor-town-walls/'),
        (['Gurd\u0107', 'Gate'], BASE + '/listing/gurdic-gate-south-gate/'),
        (['St.', 'Nicholas', 'Church'], BASE + '/listing/saint-nicholas-church/'),
        (['St.', 'Giovanni', 'Fortress'], BASE + '/listing/san-giovanni/'),
        (['Clock', 'Tower'], BASE + '/listing/kotor-clock-tower/'),
    ],
    # Page 6 (index 5) - Top Sights — full heading text
    5: [
        (['Sea', 'Gate', '(Vrata', 'od', 'Mora)'], BASE + '/listing/kotor-sea-gate/'),
        (['Fortress', 'of', 'St.', 'John'], BASE + '/listing/san-giovanni/'),
        (['Arms', 'Square', '(Trg', 'od', 'Oro\u017eja)'], BASE + '/listing/square-of-arms/'),
        (['North', 'Gate'], BASE + '/listing/river-gate-north-gate/'),
        (["St.", "Tryphon\u2019s", "Cathedral"], BASE + '/listing/saint-tryphons-cathedral/'),
        (['Cat', 'Museum'], BASE + '/listing/kotor-cats-museum/'),
        (["St.", "Luke\u2019s", "Church"], BASE + '/listing/saint-lukes-church/'),
        (['Maritime', 'Museum'], BASE + '/listing/maritime-museum/'),
    ],
    # Page 8 (index 7) - Around the Bay
    7: [
        (['Perast'], BASE + '/location/perast/'),
        (['Dobrota'], BASE + '/location/dobrota/'),
        (['Pr\u010danj'], BASE + '/location/prcanj/'),
        (['Kotor', 'Cable', 'Car'], BASE + '/listing/kotor-cable-car-shuttle-bus/'),
    ],
    # Page 11 (index 10) - Restaurants
    10: [
        (['Galion'], BASE + '/listing/restaurant-galion/'),
        (['Stari', 'Grad'], BASE + '/listing/restoran-stari-grad/'),
        (['Konoba', 'Scala', 'Santa'], BASE + '/listing/konoba-scala-santa/'),
        (['Forza', 'Mare'], BASE + '/listing/hotel-forza-mare/'),
        (['Bastion'], BASE + '/listing/bastion-1/'),
        (['Bokun'], BASE + '/listing/bokun/'),
        (['Cesarica'], BASE + '/listing/restoran-cesarica/'),
        (['Luna', 'Rossa'], BASE + '/listing/luna-rossa/'),
        (['Tanjga'], BASE + '/listing/bbq-tanjga/'),
        (['Piazza'], BASE + '/listing/piazza-restuarant/'),
    ],
    # Page 12 (index 11) - Day Trips
    11: [
        (['Perast'], BASE + '/location/perast/'),
    ],
    # Page 14 (index 13) - Kotor with Kids
    13: [
        (['Cat', 'Museum'], BASE + '/listing/kotor-cats-museum/'),
    ],
    # Page 18 (index 17) - Photo Spots — full heading text
    17: [
        (['Fortress', 'of', 'St.', 'John', '\u2014', 'Summit', 'View'], BASE + '/listing/san-giovanni/'),
        (['Perast', 'from', 'the', 'Water'], BASE + '/location/perast/'),
        (['The', 'Sea', 'Gate'], BASE + '/listing/kotor-sea-gate/'),
        (['The', 'Bay', 'from', 'Lov\u0107en', 'Road'], BASE + '/listing/kotor-cable-car-shuttle-bus/'),
        (['Rooftop', 'Views', 'from', 'the', 'Bell', 'Towers'], BASE + '/listing/saint-tryphons-cathedral/'),
        (['The', 'Cats', 'of', 'Kotor'], BASE + '/listing/kotor-cats-museum/'),
        (['Arms', 'Square', 'at', 'Night'], BASE + '/listing/square-of-arms/'),
    ],
}

# Pages to search for "Fortress of St. John" (not 5/17 - handled in page_links with full headings)
fortress_pages = [3, 7]  # pages 4, 8

all_extra_links = []
url_positions = []
typo_info = None

with pdfplumber.open(INPUT) as pdf:
    for i, page in enumerate(pdf.pages):
        ph = page.height
        words = page.extract_words()

        # kotordirectory.com text links
        for w in words:
            if 'kotordirectory' in w['text'].lower():
                url_text = w['text'].rstrip('.')
                if '/restaurants' in url_text:
                    full_url = BASE + '/listing-category/food-and-drink/restaurants/'
                else:
                    full_url = BASE
                url_positions.append((i, w['x0'], ph - w['bottom'], w['x1'], ph - w['top'], full_url))

        # Typo on page 11
        if i == 10:
            for w in words:
                if w['text'] == 'Cataro':
                    typo_info = {
                        'x0': w['x0'], 'x1': w['x1'],
                        'y_bot': ph - w['bottom'], 'y_top': ph - w['top']
                    }
                    all_extra_links.append((10, w['x0'], ph - w['bottom'], w['x1'], ph - w['top'],
                                           BASE + '/listing/restaurant-cattaro/'))

        # Page-specific content links (first occurrence only)
        if i in page_links:
            for search_words, url in page_links[i]:
                word_texts = [w['text'] for w in words]
                for j in range(len(word_texts) - len(search_words) + 1):
                    match = all(word_texts[j+k] == sw for k, sw in enumerate(search_words))
                    if match:
                        first_w = words[j]
                        last_w = words[j + len(search_words) - 1]
                        x0 = first_w['x0']
                        x1 = last_w['x1']
                        top = min(words[j+k]['top'] for k in range(len(search_words)))
                        bottom = max(words[j+k]['bottom'] for k in range(len(search_words)))
                        all_extra_links.append((i, x0, ph - bottom, x1, ph - top, url))
                        break

        # Fortress of St. John
        if i in fortress_pages:
            word_texts = [w['text'] for w in words]
            for j, wt in enumerate(word_texts):
                if wt == 'Fortress' and j+3 < len(words) and word_texts[j+1] == 'of' and word_texts[j+2] == 'St.' and word_texts[j+3] == 'John':
                    x0 = words[j]['x0']
                    x1 = words[j+3]['x1']
                    top = min(words[j+k]['top'] for k in range(4))
                    bottom = max(words[j+k]['bottom'] for k in range(4))
                    all_extra_links.append((i, x0, ph - bottom, x1, ph - top,
                                           BASE + '/listing/san-giovanni/'))
                    break

print(f"kotordirectory.com links: {len(url_positions)}")
print(f"Extra content links: {len(all_extra_links)}")

# Typo fix overlay - cover "Cataro ::::" and redraw as "Cattaro ::::"
cover_x0 = typo_info['x0'] - 0.5
cover_x1 = 350.7
cover_w = cover_x1 - cover_x0
overlay_buf = BytesIO()
c = canvas.Canvas(overlay_buf, pagesize=(595.2756, PAGE_H))
c.setFillColorRGB(1, 1, 1)
c.rect(cover_x0, typo_info['y_bot'] - 1,
       cover_w, typo_info['y_top'] - typo_info['y_bot'] + 2, fill=1, stroke=0)
c.setFillColorRGB(0.101961, 0.101961, 0.101961)
c.setFont("Carlito-Bold", 9.5)
cattaro_w = stringWidth("Cattaro", "Carlito-Bold", 9.5)
space_w = stringWidth(" ", "Carlito-Bold", 9.5)
c.drawString(typo_info['x0'], typo_info['y_bot'] + 0.3, "Cattaro")
euro_x = typo_info['x0'] + cattaro_w + space_w
c.drawString(euro_x, typo_info['y_bot'] + 0.3, "\u20ac\u20ac\u20ac\u20ac")
c.save()
overlay_buf.seek(0)
overlay_reader = PdfReader(overlay_buf)

# Build output
reader = PdfReader(INPUT)
writer = PdfWriter()
for i, page in enumerate(reader.pages):
    if i == 10:
        page.merge_page(overlay_reader.pages[0])
    writer.add_page(page)


def add_link(page, x0, y0, x1, y1, url):
    link = DictionaryObject({
        NameObject("/Type"): NameObject("/Annot"),
        NameObject("/Subtype"): NameObject("/Link"),
        NameObject("/Rect"): ArrayObject([
            FloatObject(x0 - 1), FloatObject(y0 - 1),
            FloatObject(x1 + 1), FloatObject(y1 + 1),
        ]),
        NameObject("/Border"): ArrayObject([NumberObject(0), NumberObject(0), NumberObject(0)]),
        NameObject("/A"): DictionaryObject({
            NameObject("/Type"): NameObject("/Action"),
            NameObject("/S"): NameObject("/URI"),
            NameObject("/URI"): TextStringObject(url),
        }),
    })
    if "/Annots" in page:
        page["/Annots"].append(link)
    else:
        page[NameObject("/Annots")] = ArrayObject([link])


for page_idx, x0, y0, x1, y1, url in url_positions:
    add_link(writer.pages[page_idx], x0, y0, x1, y1, url)

for page_idx, x0, y0, x1, y1, url in all_extra_links:
    add_link(writer.pages[page_idx], x0, y0, x1, y1, url)

with open(OUTPUT, 'wb') as f:
    writer.write(f)

import os
print(f"\nSaved: {OUTPUT} ({os.path.getsize(OUTPUT)/1024/1024:.1f} MB)")
print(f"\n=== All content links by page ===")
for pg, x0, y0, x1, y1, url in sorted(all_extra_links, key=lambda x: (x[0], -x[2])):
    slug = url.replace(BASE, '')
    print(f"  Page {pg+1}: {slug}")
