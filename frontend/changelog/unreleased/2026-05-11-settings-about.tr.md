---
title: Ayarlar: sürüm + hızlı bağlantılar içeren "Hakkında" bölümü
date: 2026-05-11
---

Ayarlar modalının altına **Hakkında** bölümü eklendi:

- Uygulama adı + sürüm (v0.1.0, `package.json`'dan).
- API Lab'in ne olduğunu açıklayan tek satırlık tagline.
- Küçük bir anahtar/değer listesi — Platform, Native shell, Frontend,
  Storage — alt katmandaki teknoloji yığını kara kutu olmasın diye.
- Üç hızlı bağlantı butonu: **Rehberler**, **Değişiklikler**,
  **GitHub deposu**. Rehberler + Değişiklikler, window event'i
  yayar — Ayarlar düzgün kapanır, sonra hedef modal açılır (çift
  pencere parlaması olmaz).

Ayrıca: **Klavye kısayolları** bölümüne eksik üç kayıt eklendi
(`⌘ B` kenar çubuğunu aç/kapat, `⌘ .` isteği iptal et, `?` Guide
hub'ı aç). Ayarlardaki referans artık özel rehber sayfasıyla
uyumlu.
