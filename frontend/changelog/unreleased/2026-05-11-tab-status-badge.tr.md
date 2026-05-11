---
title: Sekme şeridi artık son yanıt status kodunu gösterir
date: 2026-05-11
---

Composer üstündeki sekme şeridindeki her sekme artık method
göstergesi ile başlık arasında küçük bir status pill taşır — `200`,
`404`, `500` vb — status ailesine göre renklendirilmiş (2xx yeşil,
4xx turuncu, 5xx kırmızı, diğerleri muted).

Yoğun bir sekme şeridine hızlı bir bakış hangi isteklerin başarılı,
hangilerinin debug gerektirdiğini, hangilerinin henüz
gönderilmediğini söyler. Yanıt almamış taze sekmeler için pill
boş kalır.

Hover ile tam `200 OK` / `404 Not Found` vb. etiket; aynı string
ARIA üzerinden screen reader'lara da expose edilir.
