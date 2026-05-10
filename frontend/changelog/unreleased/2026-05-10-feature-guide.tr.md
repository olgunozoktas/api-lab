---
title: In-app özellik rehberleri — yardım için her an `?` bas
date: 2026-05-10
---

API Lab artık in-app rehber hub ile geliyor. **`?`** her an aç —
veya üst bardaki help-circle ikonuna tıkla. En yüksek leverage'lı
özellikleri kapsayan sekiz walkthrough rehberi:

- **Hızlı başlangıç** — ilk isteğin, üç pano
- **Environment'lar** — `{{var}}` substitution, context değiştirme
- **gRPC** — reflection, TLS, manuel proto fallback
- **İstek iptali** — `⌘ +.` ve Send-morph-to-Cancel butonu
- **Hızlı geçiş** — `⌘ P` ve multi-tab pattern'leri
- **Examples** — yanıt fixture'larını kaydetme
- **WebSocket ve SSE** — streaming protokoller
- **Postman import** — koleksiyonları taşıma

title / group / body üzerinde arama yan menüyü canlı filtreler.
Rehberler `frontend/src/guides/` altında markdown dosyaları;
yeni entry'ler rebuild sonrası başka kod değişikliği olmadan
görünür hale gelir.

Changelog modal'ını besleyen aynı el yazımı markdown subset
renderer'ı reuse eder — yeni bağımlılık yok, escape-by-default
güvenlik.
