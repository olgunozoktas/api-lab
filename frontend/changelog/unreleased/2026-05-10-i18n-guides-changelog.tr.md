---
title: Yerelleştirilmiş rehberler + changelog — aktif dile göre değişir
date: 2026-05-10
---

In-app **Rehberler** ve **Changelog** modal'ları artık **Ayarlar →
Dil** ile seçilen aktif dili takip eder. İngilizce'den Türkçe'ye
(veya tersine) geç, modal bir sonraki açılışta eşleşen çeviriyle
yeniden render olur.

## Nasıl çalışıyor

Her entry artık `frontend/src/guides/` veya
`frontend/changelog/{released,unreleased}/` altında
`<slug>.<lang>.md` olarak yaşıyor. Vite'in build-time glob'u tüm
variant'ları topluyor; küçük bir selector fonksiyon render
zamanında her slug için aktif-locale versiyonunu seçiyor.

Aktif locale için çeviri eksikse modal İngilizce'ye fallback yapar,
böylece kullanıcı hep *birşey* görür — kısmi kapsam yeterli.

## Neler çevrildi

Bu slice ile tüm 14 rehber + tüm 6 changelog entry (v0.1.0 + 5
unreleased) hem İngilizce hem Türkçe ile gelir. Yeni locale eklemek
= `lib/i18n/`'de tek dictionary dosyası + markdown dosyalarını yeni
lang suffix'i altında çoğaltmak.

## Bundle etkisi

Türkçe çeviriler JS bundle'a ~40 KB raw / ~14 KB gzipped ekledi
(hala 1300/400 KB CI guardrail altında). Gelecek diller birikir —
üçüncü locale eklediğimizde lazy-load language pack için
follow-up var.
