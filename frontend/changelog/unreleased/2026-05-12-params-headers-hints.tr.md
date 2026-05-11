---
title: Composer Params + Headers sekmeleri: açıklama ipuçları
date: 2026-05-12
---

Auth + Body sekmelerine uygulanan aynı ipucu deseni: **Params** ve
**Headers** composer sekmeleri artık KV tablosunun üstünde, her
listenin ağ üzerinde ne yaptığını açıklayan küçük bir not gösteriyor:

- **Params** — etkin satırlar URL'ye
  `?key=value&key=value` olarak eklenir. `{{var}}` referansları istek
  atılırken değiştirilir.
- **Headers** — istek header'ları olduğu gibi gönderilir. Auth veya
  Body sekmesinin eklediği header'ları override edebilirsiniz (örn.
  kendi `Content-Type`'ınız). Değerlerde `{{var}}` desteklenir.

Composer'ın dört sekmesi de (Params / Headers / Auth / Body) artık
tutarlı şekilde, üstte tek satırlık "bu ne gönderir" notuyla geliyor.
