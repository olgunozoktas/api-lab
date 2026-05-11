---
title: Geçen süre rozetine gelince zamanlama dökümünü görün
date: 2026-05-12
---

Zig köprüsü curl'ün zamanlama dökümünü zaten toplyordu — ama UI
sadece tek bir geçen-ms sayısı gösteriyordu. Rozet artık üzerine
gelindiğinde tam dökümü açıyor:

- **DNS** — isim çözümleme süresi
- **TCP / TLS handshake** — connect süresi
- **TTFB (ilk byte)** — istek tele düştükten sonra ilk byte'a kadar
  geçen süre
- **Toplam** — round-trip toplamı

Döküm, "bu istek yavaştı" cümlesini "DNS 700ms aldı", "TLS 1.2s
sürdü" ya da "sunucu ilk byte'ı göndermeden 4s bekledi" gibi üç
farklı problem hâline çevirir. Zamanlama verisi olmayan geçmiş
isteklerinde rozet eski sade "Geçen süre: Xms" hâline düşer.
