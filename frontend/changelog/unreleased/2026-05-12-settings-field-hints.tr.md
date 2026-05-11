---
title: Ayarlar → Varsayılan değerler: alan başına açıklama
date: 2026-05-12
---

**Ayarlar → Varsayılan değerler** altındaki her alan artık inputun
altında tek satırlık küçük bir ipucu gösteriyor:

- **Zaman aşımı (ms)** — istek başarısız sayılmadan önce yanıt için
  beklenecek süre (varsayılan 60000 = 1 dakika).
- **Yönlendirme limiti** — 3xx zincirinde maksimum hop sayısı; `0`
  otomatik yönlendirmeyi kapatır.
- **TLS doğrulamasını atla** — curl'ün `-k` bayrağı ile aynı;
  self-signed dev API'leri için pratik, production'a karşı
  kullanmayın.

Composer sekme ipuçlarının takip ettiği desenin aynısı — açıklama
kontrolün hemen yanında, ne işe yaradığını anlamak için modaldan
çıkmanıza gerek yok.
