---
title: Mock sunucu — kayıtlı örnekleri HTTP üzerinden servis et
group: Composer
order: 5
---

Mock sunucu, kaydettiğin yanıt **Örnek**lerini gerçek bir yerel
HTTP sunucusuna dönüştürür. Herhangi bir aracı — curl, tarayıcı,
makinendeki başka bir servis — ona yönlendir ve kayıtlı yanıtı
geri al.

## Mock başlatma

1. Bir istekte bir veya daha fazla yanıtı **Örnek** olarak kaydet
   (Örnekler rehberine bak).
2. **Mock sunucu** panelini aç — üst bardaki sunucu ikonu.
3. O istek aktifken **Mock başlat**'a bas. API Lab bir loopback
   HTTP listener bağlar ve sana bir `http://127.0.0.1:<port>`
   adresi verir.

## İstekler nasıl eşleşir

Mock, gelen bir isteği kayıtlı bir örnekle **metod + yol** üzerinden
eşleştirir — `GET /api/users` o rota için kaydettiğin örneği,
orijinal status kodu, header'ları ve body'siyle döndürür. Query
string yok sayılır. İki örnek aynı `(metod, yol)`'u paylaşıyorsa
ilki kazanır.

Hiçbir şeyle eşleşmeyen istek, kısa bir tanılama body'siyle `404`
alır.

## Mock'ları yönetme

Panel, çalışan her mock'u base URL'i ve örnek sayısıyla listeler.
**Durdur** birini, **Hepsini durdur** hepsini sonlandırır. Mock'lar
yalnızca `127.0.0.1`'e bağlıdır — makinen dışından erişilemez — ve
API Lab'ı kapattığında otomatik kapanır.

## Sınırlar (v1)

- Eşleşme yalnızca `(metod, yol)` — henüz query / header / body
  eşleşmesi yok.
- Mock başına istek logu yok.
- Mock, API Lab process'inin içinde yaşar; uygulamayı kapatmak
  çalışan her mock'u durdurur.
