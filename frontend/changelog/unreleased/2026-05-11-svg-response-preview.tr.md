---
title: Yanıt body panelinde SVG önizleme
date: 2026-05-11
---

Bir API `image/svg+xml` (veya `<svg` ile başlayan bir body)
döndürdüğünde, yanıt **Body** sekmesi artık raw markup yerine
SVG'yi inline görsel olarak render eder.

Uygulama: SVG body'i `data:image/svg+xml;utf8,…` URL'i olarak
encode edilir ve bir `<img>` etiketine bırakılır. Browser'lar
image context'te kullanılan SVG'lerde script çalıştırmayı açıkça
kapatır (SVG-as-image güvenlik modeli), böylece `<script>`
içeren SVG'ler bile kod çalıştıramaz — iframe sandbox'a gerek
yok, render yolu yine güvenli.

**Raw** alt-sekmesi hâlâ kaynak markup'ı sunar. Daha önce
inen HTML önizleme ile aynı pattern — ikisi de **Body**'de
otomatik algılanan görsel önizleme, **Raw**'da kaynak markup,
yeni sekme yok.
