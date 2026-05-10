---
title: WebSocket ve SSE — streaming protokoller
group: Protokoller
order: 2
---

API Lab URL şemasına göre doğru sekmeyi otomatik aktif eder:

- `ws://` veya `wss://` → WebSocket sekmesi
- `sse://` veya `sses://` → Server-Sent Events sekmesi
- `grpc://` veya `grpcs://` → gRPC sekmesi
- diğer her şey → HTTP composer

## WebSocket

1. URL bara `wss://echo.websocket.org` yaz.
2. **Bağlan**'a tıkla. Status pill BAĞLANIYOR → AÇIK.
3. Send box'a bir mesaj yaz, `⌘ Enter` veya **Gönder**'e bas.
4. Gelen mesajlar log'a akar. JSON otomatik algılanır ve
   pretty-print edilir.

**Ping** bir `"ping"` text frame yollar — liveness check için.
**Logu Temizle** sekme içi log'u temizler ama bağlantıyı kapatmaz.

## Server-Sent Events

`sse://` ve `sses://` (TLS) URL'ler sunucudan tek-yönlü stream
açar. Şuna kullan:

- Real-time dashboard'lar (CPU/RAM/log feed'leri).
- Uzun-süreli operasyonlardan progress event'ler.
- Chat-style asistan stream'leri.

Adlandırılmış event'ler (`event: foo\ndata: ...`) tag olarak
gösterir. **Last event ID** sütunu reconnect sonrası resume
için cursor olarak kullanılabilir.

## Yeniden bağlanma

WebSocket: sadece manuel — **Bağlan** butonuna tekrar tıkla.

SSE: tarayıcı transient hatalarda otomatik reconnect eder.
**Yeniden Bağlan** taze bağlantı zorlar.
