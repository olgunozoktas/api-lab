---
title: Yazar attribution header'ları + üst çubukta v{version} rozeti
date: 2026-05-12
---

API Lab artık yazar kimliğini her yerde taşıyor:

- **Üst çubuk** — API Lab başlığının yanında küçük bir `v0.1.0`
  rozeti; Ayarlar → Hakkında'daki sürümle aynı.
- **Kaynak dosyalar** — `frontend/src/` altındaki her `.ts` / `.tsx` /
  `.css` ve `src/` altındaki her `.zig` dosyası tek satırlık
  `/** Olgun Özoktaş geliştirdi · API Lab */` attribution header'ı
  ile açılıyor. Yeni dosyalar aynı kuralı izlemeli (CLAUDE.md
  belgeledi).
- **Giriş noktaları** (`main.tsx`, `App.tsx`, `main.zig`, `build.zig`)
  yazar/repo/lisans bilgisini içeren tam banner taşıyor.
- **package.json** standart `author` + `homepage` + `repository`
  alanlarını kazandı.
- **README.md** + **CLAUDE.md**'ye **Author** bölümü eklendi.
- **README.md** Features ve Keyboard reference bölümleri son
  shipping turunu yakalayacak şekilde yenilendi (⌘+B, ⌘+K, ⌘+L,
  ⌘+., ⌘+Shift+T, ⌥⌘→/←, mod başı ipuçları, ortam değişken
  rozetleri, zamanlama tooltip'i, durum sınıfı açıklaması, kenar
  çubuğu boş-durum rehberleri, Hakkında veri istatistikleri,
  varsayılana dön, ve daha fazlası).
