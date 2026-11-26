# Place guides: 3D map fly-in, pin, open-licence photos and clips, credits, permission

For "แนะนำร้านอาหาร / คาเฟ่ / ที่เที่ยว / landmark" videos: a 3D city built from OpenStreetMap rises, the camera
flies down to the place, a pin drops, then photos and a clip of the place, each with its credit on screen, and an
end card with the address and every credit. Route: `director.py route "<brief>"` → capability `place`
(`init --caps place` copies `lib/three`, `lib/map3d`, `src/food-spot/FoodSpot.tsx` and registers `FoodSpot`).

## 1. Fetch the place

```bash
python3 "$SKILL_DIR/scripts/place.py" fetch "ร้านเจ๊ไฝ กรุงเทพ" --out ~/videos/<slug>/public/place/<slug> \
  --name "ร้านเจ๊ไฝ" --photo-query "Jay Fai" --video-query "Bangkok street food" --photos 5 --videos 1 --clip 6
```
- Geocoding: Nominatim (1 request/s, the script waits). Wrong match → add the district/province, or pass `--lat --lon`.
- Map: Overpass (buildings with height from `height` / `building:levels`, roads by class, water, parks) within
  `--radius` metres (default 450), stored as metres east/north of the pin in `place.json`.
- Media: Wikimedia Commons only: files geotagged near the place plus `--photo-query` / `--video-query` text search,
  filtered to `--licenses cc0,pd,by,by-sa` (no NC/ND, nothing without a licence field). Photos are resized to 1600 px,
  videos cut to `--clip` seconds from `--clip-from` and converted to MP4.
- Output: `place.json` (map + credits), `photos/`, `videos/`, `CREDITS.md` (paste into the caption), `PERMISSIONS.md`.
- Look at every photo and clip before using it. Commons search is loose: a clip of "Bangkok street food" is not
  this restaurant, so label it on screen ("ภาพประกอบ ไม่ใช่ร้านนี้", `video.note`) or leave it out.

## 2. Edit

`FoodSpot` props: `dir`, `hook`, `tagline`, `photos: [{ i, text }]` (index in `place.json`), `video: { i, text, note }`
or `null`, `cta`, `music`, `musicCredit`. Length follows the content: map 6.7 s, 2.2 s per photo, 5 s clip, 4 s end card.
- Map (`lib/map3d`): `CityMap` (extruded blocks rise with `riseIn`, the building under the pin in the accent colour),
  `MapPin` (drops, bounces once, ripple), `flyTo(p)` (log zoom: same perceived speed at every height, like map
  apps; high and top-down → low three-quarter), `screenOf()` to pin HTML labels to 3D points, `MAP_STYLES.day/night`,
  `OsmCredit`. Stage3D needs `far={4000}` for city scale.
- Calm by default (`editing-craft.md` section 0): one fly-in, one soft transition into the photos, hard cuts on the
  beat after that, slow Ken Burns (≤ 1.12×). No whips between photos.
- Credits on screen: `ภาพ: <author> · <licence> · Wikimedia Commons` on every photo/clip while it is visible, the
  OSM line on the map and end card. Do not crop the credit out in other formats (it sits in the safe area).
- CC BY-SA media: the finished video counts as an adaptation, say "CC BY-SA 4.0" in the caption (`CREDITS.md` does).
- No open media of the place? Make the video from the map, the address card and the user's own photos.

## 3. Clips from TikTok, YouTube, Instagram, Facebook, Google Maps reviews

Never download them, even when public: the platforms' terms forbid it and most posts carry no reuse licence.
`place.py fetch` and `permission` refuse those links. Instead:
1. Tell the user that public is not the same as free to reuse, and that the owner must agree first.
2. `python3 place.py permission --owner "<channel>" --link <url> --use "คลิปแนะนำร้าน"` prints a Thai message
   (what clip, how many seconds, where it will be posted, how the credit will look, original file without
   watermark, written OK kept in the chat).
3. When the owner sends the file and the user confirms permission, put it in `public/place/<slug>/videos/`, add it
   to `place.json` `videos` with `author` = the channel, `license` = "ได้รับอนุญาต" and `site` = "TikTok" (or the
   platform); `FoodSpot` credits it on screen and on the end card. Add a line to `CREDITS.md`.
- Also ask before featuring identifiable people up close, a restaurant's logo, menu art or signage as the main
  subject, or a review's text. Food, streets and buildings in the background are fine.

## 4. QA

Pin card readable over the map, no text on the pin; every visible photo/clip has its credit; OSM credit on the map;
`CREDITS.md` pasted into the post caption; clip relevance checked; `director.py qa` for black frames and loudness.
