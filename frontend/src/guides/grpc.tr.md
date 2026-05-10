---
title: gRPC — reflection-cached servis tarayıcı
group: Protokoller
order: 1
---

URL'in `grpc://` veya `grpcs://` ile başladığında gRPC sekmesi
otomatik aktif olur. API Lab gerçek RPC çağrısı için `grpcurl`
kullanır — bir kez kur:

```
brew install grpcurl
```

`grpcurl` `PATH`'de değilse "GRPCURL YOK" status'unu görürsün;
sekmedeki hata kurma talimatı içerir.

## Reflection ile servis tarama

Sunucuda reflection açıksa (modern gRPC sunucularının çoğu açar):

1. URL bara `grpc://host:port` yaz.
2. Sol panelde **Servisleri tara**'ya tıkla.
3. Bir method seç — API Lab proto şemasından JSON iskeleti üretir.
4. Body'i düzenle, **Çağır**'a bas.

Servis listeleri 5 dakika boyunca `host:port` başına cache'lenir.
Cache hit'i servis sayısının yanında `(önbellek, Xs önce)` rozetiyle
işaretlenir. **Yenile** elle invalidate eder.

## TLS

**TLS** alt-sekmesi CA cert + client cert + client key (PEM,
yapıştır) kabul eder. Çağrı başına temp dosyalar
`/tmp/api-lab-grpc-*` altına `0o700` dir / `0o600` file modlarıyla
yazılır; çağrı bitince temizlenir. Self-signed dev sunucu + mTLS
prod servisler ikisi de çalışır.

## Reflection olmadan

**Server reflection kullan**'ı kapat, sonra **import path**
(virgülle ayır) ve **.proto dosyaları** doldur. v1 sınırlaması:
WKWebView dosya seçicileri kısıtladığı için sadece-yapıştırma
yöntemi var. Backlog'da gerçek picker için follow-up var.
