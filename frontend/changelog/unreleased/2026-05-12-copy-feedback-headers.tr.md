---
title: Response headers tablosundaki kopya butonları da tik gösteriyor
date: 2026-05-12
---

Response → Headers sekmesinde her satırın değer hücresinde
hover'da çıkan kopya ikonu, artık v0.2.23'te Body Kopyala
butonuyla gelen aynı Copy→Check flash'ını kullanıyor. Her satır
kendi durumunu takip ediyor; bir satırda Copy'ye basmak diğer
satırları görsel olarak "kopyalandı" göstermiyor.

Tıkladıktan sonra tik butonu ~1,2 saniye boyunca görünür tutuyor;
imlecin satırdan çıkmış olsa bile geri bildirim göze çarpıyor —
bir başlık bloğunda (Authorization, Set-Cookie, X-Request-Id, …)
arka arkaya kopya alırken işe yarıyor.
