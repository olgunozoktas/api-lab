---
title: URL çubuğu, `{{var}}` referanslarının çözümlenmiş hâlini gösteriyor
date: 2026-05-11
---

URL'niz `{{baseUrl}}/users` gibi yer tutucular içerdiğinde, URL
girişinin altında aktif ortama göre çözümlenmiş değeri gösteren
soluk bir önizleme satırı belirir (`→ https://api.test/users`).
Send'e basmadan önce "şu an `{{baseUrl}}` neye işaret ediyor?" diye
düşünmeye gerek yok — cevap orada.

Önizleme, düz URL'lerde (hiç `{{` yoksa) ve çözümleme aynı dizgeyi
ürettiğinde tamamen gizlenir. Hızlı yol: URL'de yer tutucu yokken
tek regex kontrolü tüm ortam taramasını atlar.
