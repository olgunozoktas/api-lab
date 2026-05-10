---
title: Yeni istekte protokol seçici + boş yanıt panelinde geçmiş önerileri
date: 2026-05-10
---

Yeni istek akışı için üç küçük UX iyileştirmesi.

## Protokol seçici

Herhangi bir klasöre sağ tıkla → "Yeni HTTP isteği" / "Yeni
GraphQL" / "Yeni WebSocket" / "Yeni SSE" / "Yeni gRPC". Seçilen
tip URL ön ekini (`wss://`, `sses://`, `grpcs://`) doldurur ve
GraphQL `isGraphql` flag'ini set eder, böylece istek üzerine
geldiğinde doğru composer sekmesi aktif olur — `wss://` elle
yazmaya gerek yok.

## Boş yanıt panelinde yakın geçmiş

Yeni bir istek henüz gönderilmediğinde, sağ pano artık en yakın
6 geçmiş öğesini tek tıklamalı kart olarak gösterir (method +
status + URL + geçen ms). Birine tıkla, aktif sekmeye yüklenir —
"dünkü çağrıyı tekrar atmak istiyorum ama bir header'ı değiştireceğim"
durumu için kullanışlı. Klasik "İstek atmaya hazır · ⌘+Enter /
⌘+S / ⌘+N" ipucu hâlâ üstte kalır.

## Tek-env kullanıcı için daha sessiz üst bar

Sadece tek environment varsa üst bardaki `default` environment
dropdown'u gizlenir — amaçsız görsel gürültü yapıyordu. "Env..."
butonu durur, böylece kullanıcı ikinci environment'ı keşfedip
oluşturabilir; o noktada dropdown otomatik olarak geri gelir.
