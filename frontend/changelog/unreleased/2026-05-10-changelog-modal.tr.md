---
title: Changelog modal — yenilikleri uygulama içinde gör
date: 2026-05-10
---

API Lab artık in-app changelog ile gelir. Upgrade sonrası ilk
launch'ta, son baktığından beri inen her şeyle bir "Yenilikler"
modal'ı otomatik açılır. Üst bardaki clock-history butonu her an
tekrar açar.

- **Upgrade'de auto-open** — bundle'lı `APP_VERSION`'ı IDB-persist
  edilmiş `lastSeen`'e karşı kıyaslar, upgrade başına bir kez açar.
- **Manuel erişim** — Env... ile Ayarlar arasındaki clock-history
  ikonu modal'ı `lastSeen`'e dokunmadan açar.
- **Markdown formatlaması** — entry'ler heading, liste, code block,
  link, bold/italic destekler. Escape-by-default güvenlikli el
  yazımı subset renderer; yeni bağımlılık yok.

Changelog entry'leri repo root'ta
`changelog/{released,unreleased}/*.md` dosyalarında yaşar. Bu
ship'ten itibaren, her kullanıcı görünür değişiklik
`changelog/unreleased/`'e bir markdown dosyası bırakır
(CLAUDE.md hard rule). İçsel refactor'lar entry gerektirmez —
yazar karar verir, reviewer kanı yanlışsa pushback yapar.
