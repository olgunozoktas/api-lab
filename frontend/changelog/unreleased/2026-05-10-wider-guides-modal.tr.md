---
title: Daha geniş modal'lar + changelog gerçekten populate oluyor + 6 yeni rehber
date: 2026-05-10
---

Üç şey birlikte indi — in-app yardım yüzeylerinde saf UX polish.

## Daha geniş modal'lar

- **Rehberler** (`?` shortcut, üst bar help butonu) — `max-w-4xl` →
  `max-w-6xl` (≈1152px max), pencere genişliğinin %92'sine clamp,
  yan menü 220 → 260 px genişledi, böylece uzun rehber başlıkları
  wrap olmaz.
- **Changelog** (üst bar clock butonu) — aynı 92vw clamp'le
  `max-w-2xl` → `max-w-4xl`. Her entry kart code block + bullet
  liste için daha fazla yatay alana sahip.

İkisi de 88vh dikey max'a çıkarıldı.

## Changelog artık gerçekten entry gösteriyor

`changelog/` dizini eskiden repo root'ta yaşıyordu. dnpm docker
build container'ı sadece `frontend/` mount ettiği için
`frontend/changelog/`'a taşındı —
`import.meta.glob('../../../changelog/...')` build sırasında
sessizce hiçbir şeye resolve oluyordu, modal boş kart listesi
render ediyordu.

Aynı kısıtlama `APP_VERSION`'ı top-level `VERSION` dosyası yerine
`frontend/package.json`'dan okumaya zorlamıştı. CLAUDE.md hard
rule yeni path'i referans alacak şekilde güncellendi.

## Altı yeni rehber

Rehber hub'ı dolduruldu — toplam 14:

- **Koleksiyonlar — istekleri klasörlerde organize et** (Çalışma Alanı)
- **Body modları — JSON, form-encoded, raw** (Composer)
- **Auth — Bearer, Basic, API Key, OAuth 2.0 helper** (Composer)
- **Pre / post-request script'leri — pm.\* sandbox** (Otomasyon)
- **Değişken olarak kaydet — yanıttan sonraki isteğe zincirle** (Otomasyon)
- **Kod olarak kopyala — bir isteği tek satır olarak paylaş** (Çalışma Alanı)

`released/v0.1.0.md` entry'si de büyük genişleme aldı — ilk
commit'ten changelog modal'ına kadar her büyük slice mimari,
composer, çalışma alanı, yazma, iptal, görünüm + his, güvenilirlik,
build ve platform notlarını kapsayan bölümler altında dökümante
edildi.
