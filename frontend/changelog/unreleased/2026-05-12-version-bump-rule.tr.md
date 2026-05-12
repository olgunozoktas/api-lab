---
title: v0.2.0 — sürüm artırma kuralı + bump-version.sh helper
date: 2026-05-12
---

API Lab artık açık bir sürüm artırma politikasıyla geliyor.
`frontend/package.json`'daki `version` alanı tek doğruluk kaynağı
(`__APP_VERSION__`'a, TopBar rozetine, Ayarlar → Hakkında'ya ve
changelog otomatik açılma kapısına besler). Bundan sonra
`frontend/changelog/unreleased/` altına markdown girdisi düşen her
commit / PR aynı commit'te sürümü de bumplamak ZORUNDA. CLAUDE.md'de
hard rule olarak belgelendi.

Sürüm politikası (semver benzeri):

- **Patch** — küçük UX cilası, metin değişikliği, tek panel ipucu.
- **Minor** — yeni özellik yüzeyi, birden fazla patch'in birleşimi.
- **Major** — kırıcı değişiklikler için ayrılmış.

Yeni helper:

```bash
bash scripts/bump-version.sh           # patch (varsayılan)
bash scripts/bump-version.sh minor
bash scripts/bump-version.sh major
```

Saf shell + `awk`; `npm` çağırmaz (dnpm-only politikasını ihlal
ederdi). Sürümü artırır + sonucu yazdırır; değişiklik unstaged kalır,
slice'ın geri kalanıyla birlikte gözden geçirip commit'leyebilirsiniz.

Bu sürüm v0.1.0'dan beri inen düzinelerce cila slice'ını yansıtmak
için **v0.2.0** olarak çıkıyor — panel başına ipuçları (Auth / Body /
Params / Headers / Env), sekme şeridi iyileştirmeleri (URL'den otomatik
isim, durum rozeti, kayma, sabitleme, ⌘+Shift+T), geçmiş filtresi
pilleri + bağlam menüsü, yanıt zamanlama tooltip'i, durum sınıfı
tooltip'i, kenar çubuğu boş-durum rehberleri, Ayarlar → Hakkında
kartı + Verileriniz istatistik gridi + Varsayılana dön, ⌘ K / ⌘ B /
⌘ L / ⌘ . / ⌥⌘→← kısayolları, attribution header'lar ve yenilenmiş
README.
