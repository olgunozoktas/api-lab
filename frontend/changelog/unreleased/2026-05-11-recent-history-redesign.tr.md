---
title: Yanıt panelindeki "Yakın geçmiş" baştan tasarlandı
date: 2026-05-11
---

Boş yanıt panelinde gösterilen "Yakın geçmiş" önerileri yenilendi:

- **Tekrar eden kayıtlar birleştirildi** — aynı `method + URL` tek bir
  satıra düşer, yanında `×N` rozetiyle kaç kez gönderildiği gösterilir.
  Artık altı kere aynı "GET 200 /users/octocat" satırı yok.
- **Durum pili** — yanıt durumu, yanıt başlığıyla aynı renkli pil
  stilini kullanır (2xx yeşil, 4xx turuncu, 5xx kırmızı).
- **Zaman bilgisi** — her satırda göreli zaman damgası (`2m`, `3h`,
  `5d`) — az önce gönderilen mi yoksa geçen haftadan kalma mı bir
  bakışta belli olur.
- **Yanıt boyutu** — geçen süreyle birlikte byte/KB/MB gösterilir.
- **Sağ tık menüsü** — kenar çubuğundakiyle aynı dört eylem (Tekrar
  oynat / Yeni sekmede aç / URL'yi kopyala / Sil).

Türkçe locale'inde "RECENT HISTORY" yazısını "RECENT HİSTORY" (noktalı
İ) yapan büyük harf hatası da düzeldi — başlık artık küçük/büyük karışık,
CSS `text-transform` yok.
