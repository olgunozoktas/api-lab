---
title: Examples — yanıtları fixture olarak kaydet
group: Composer
order: 2
---

Examples, kayıtlı bir isteğe bağlı yanıt snapshot'larıdır. İşine
yarar:

- "Başarı şu şekilde görünür" durumunu istekle birlikte
  döküman et.
- Bugünün yanıtını dünkü ile karşılaştır.
- (Yakında gelen) Zig sidecar mock sunucusunu besle.

## Örnek kaydetme

1. Bir istek gönder.
2. Yanıt panelinde **Examples** alt-sekmesine geç.
3. **Örnek olarak kaydet**'e tıkla.
4. İsim ver (örn. "happy path", "rate limited 429").

Örnek kayıtlı istekle birlikte persist olur. Uygulamayı tekrar
yükle — hala orada.

## Sınırlama

Examples sadece **kayıtlı** isteklerde yaşar. İstek henüz bir
koleksiyona kaydedilmediyse (`⌘ S`), examples aktif sekmenin
çalışan state'ine kaydedilir ama reload'da kalmaz. Önce isteği
kaydet, sonra example ekle.

## Examples ile neler yapabilirsin (şu an + yakında)

- **Şu an:** Examples panelinden görüntüle, yeniden adlandır, sil.
- **Yakında (backlog):** built-in mock server (Zig sidecar) kayıtlı
  example'ları offline development için HTTP üzerinden servis eder.
