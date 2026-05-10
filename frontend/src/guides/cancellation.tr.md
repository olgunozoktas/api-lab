---
title: İstek iptali — havadaki çağrıyı durdur
group: Composer
order: 1
---

İstek havadayken **Gönder** butonu kırmızı **X İptal** butonuna
dönüşür. Tıkla — veya canonical macOS abort hareketi
**`⌘ + .`** bas — istek hemen iptal edilir. UI ready state'e döner
ve toast onaylar.

## Altta neler oluyor

WebKit fetch path'i kullanan HTTP istekleri için bir `AbortSignal`
`fetch()` çağrısına geçirilir. Native socket gerçekten kapanır;
veri akmaya devam etmez.

Native bridge (curl subprocess) üzerinden giden istekler için
JavaScript tarafı hemen abort eder ama curl process doğal
tamamlanana kadar çalışmaya devam eder. Bu dökümantelidir;
bir sonraki bridge komutu hala çalışan curl'ün arkasında
configured timeout'a kadar kuyrukta bekler.

## Ne zaman faydalı

- Zaten timeout olacak uzun-yanıt veren istekler.
- Yanlış endpoint'e istek attın, yanıt sonsuza kadar gibi.
- Mid-debug, body yanlış olduğunu fark ettin — abort + edit + tekrar
  gönder, tamamlanmasını beklemekten daha iyi.

## NE YAPMAZ

- WebSocket / SSE bağlantılarını iptal etmez — onların kendi
  **Bağlantıyı kes** kontrolleri var.
- Diğer sekmelerdeki eşzamanlı istekleri iptal etmez — her
  sekme kendi iptal state'ini taşır.
