# Зимняя тема

Локальный просмотр: http://localhost:8080/local/?theme=winter

Тема выбирается над игрой и сохраняется на устройстве. Доступна в local, bot и online; правила и оригинальные портреты зверей общие. Художественные описания находятся в `public/themes/winter.js`.

## Пещера и капкан, версия 2

Созданы встроенным ImageGen с прозрачным фоном. Оригиналы: `public/assets/themes/winter/den-v2.png` и `public/assets/themes/winter/trap-v2.png`. WebP 128/256/768 px создаются `scripts/optimize-winter-art.py` (Pillow). Поле и справочник используют 256 px; карточка загружает 768 px только при открытии. Рисунки расположены внутри стабильного SVG-контейнера, переключение тем не перестраивает клетки.

Промпт пещеры:

> Use case: stylized-concept. Asset type: small transparent board game terrain token illustration, snowy cave den. Create ONE isolated natural rock cave entrance, straight frontal view, compact roughly square silhouette. Realistically hand-painted Chinese ink and watercolor on paper, matching fierce realistic ink animal portraits and an illustrated snowy pine forest board game. Asymmetrical rugged blue-gray stone boulders forming a low arch, a deep black and dark navy cave opening occupying the center and lower center, heavy soft fresh snow on the uneven top rocks and small snowbanks at the base. Visible mineral texture, delicate irregular ink brush contours, textured watercolor washes, convincing volume, soft natural winter daylight, restrained palette slate gray and icy white. Entire cave visible without cropping. Clear simple silhouette legible at 40 pixels. Fill 88% of the canvas with the cave, tightly composed. Transparent background outside the cave with a tiny natural soft contact shadow at its base. No scenery behind it, no ground plane, no trees, no animals, no text, no symbols, no circle, no border, no cartoon, no flat vector, no glossy 3D, no watermark.

Промпт капкана:

> Use case: stylized-concept. Asset type: small transparent board game terrain token illustration, open metal jaw trap. Create ONE isolated traditional open steel foothold trap, clearly recognizable realistic mechanism, viewed from slightly above (three-quarter overhead), compact roughly square silhouette. Two open semicircular curved metal jaws with a few broad triangular inward teeth surrounding a round trigger pressure plate in the middle, hinged on both sides, simple iron spring base under the plate, a very short chain trailing to lower right. Empty trap, no animal. Realistically hand-painted Chinese ink and watercolor on paper, matching realistic ink animal portraits and an illustrated snowy pine forest board game. Worn charcoal-gray iron, silver worn edges, subtle brown patina, convincing thickness and cast shadows, irregular delicate ink brush contours and textured washes, muted winter daylight. A few tiny snow traces on the base, but all the metal jaws clearly exposed. Clear silhouette and strong contrast legible at 40 pixels, broad details not intricate tiny machinery. Entire trap visible without cropping, fills 88% of canvas. Transparent background, small natural soft contact shadow only. No background scenery, no ground plane, no text, no symbols, no circle border, no cartoon, no flat vector, no glossy 3D, no blood, no gore, no watermark.

## Звери со снежной пудрой

Восемь отдельных правок через встроенный ImageGen. Каждый оригинальный PNG передан как единственный edit target; исходники классической темы сохранены. Новые оригиналы: `public/assets/themes/winter/{rat,cat,dog,wolf,leopard,tiger,lion,elephant}-snow-v1.png`. WebP 128/256/768 px генерируются тем же `scripts/optimize-winter-art.py`; 768 px загружается только для открытого описания. При смене темы меняются адреса изображений в существующих узлах, без перестройки доски и записи партии.

Одинаковый промпт для каждого из восьми оригиналов:

> Use case: lighting-weather. Edit target: the attached transparent animal game portrait. Make ONLY one small change: add a VERY LIGHT natural dusting of fresh powder snow, mostly a few small irregular white specks and two or three thin small patches resting on the top of the head and upper edges of the ears; for a maned animal also a few sparse grains on the highest mane tufts. Snow covers less than 7 percent of the animal. It should look as if a little snow has just fallen on it, not a snow hat. Preserve EXACTLY the animal's identity, pose, gaze, expression, anatomy, shape, original fur colors and markings, composition, illustration style, ink brushwork and framing. Keep eyes, nose, mouth and facial features fully unobstructed. For the rat preserve its full upright body, raised forepaws, feet and curved tail exactly; add just a tiny sprinkle on crown and shoulders. For the elephant preserve spread ears, tusks and upward-curled trunk. Match existing Chinese ink and watercolor printed board game style. Preserve genuinely transparent background and all existing transparency. No falling snow in the empty background, no scenery, no ground, no snow below the animal, no accessories, no text, no new border, no cropping, no zoom, no redesign. Output a single same-sized isolated transparent portrait.

## Фон леса

Фон создан встроенным ImageGen по зимнему направлению из пользовательского референса «Четыре сезона одной джунглевой игры». Оригинал: `public/assets/winter-forest-v1.png`. Для страницы используется `public/assets/winter-forest-v1.webp` (1200 × 1500 максимум, качество 86, Pillow).

Промпт генерации:

> Use case: stylized-concept. Asset type: decorative background for a playable winter jungle chess board. Create a portrait 4:5 Chinese ink and watercolor illustration on pale icy white rice paper. Frame the image with snow-laden dark evergreen pine branches, twisting dark brown trunks and a few gray rock outcrops along the far left and right edges, like the winter panel (bottom left) in the user's four-season reference. Composition requirement: the entire central 76% of width and 92% of height is almost blank pale snow paper with very subtle powdery blue watercolor texture, intended to have a real playable board drawn over it by code. Trees and rocks concentrated in the outer 12% on each side; sparse branch tips at top and bottom corners. Crisp expressive brush strokes, textured printed board game art, quiet winter daylight, muted pine green, blue-gray shadows and white snow. Flat top-down decorative illustration, no perspective. No game grid, no pieces, no animals, no river, no text, no symbols, no border lines, no watermark.
