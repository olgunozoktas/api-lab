---
title: Yanıt body panelinde HTML önizleme
date: 2026-05-11
---

Bir API `text/html` (veya `<!doctype html` / `<html` ile başlayan
bir body) döndürdüğünde, yanıt **Body** sekmesi artık sayfayı raw
markup yerine tamamen sandbox'lı bir iframe içinde render eder.

iframe `sandbox=""` kullanır (script yok, form yok, popup yok,
üst-navigasyon yok, same-origin depolama yok), böylece kötü niyetli
HTML bile uygulamaya kaçamaz — sadece görsel önizleme. Kaynak
görünümü hâlâ **Raw** alt-sekmesinde tek tık.

Kullanım alanları:

- Status sayfası döndüren health-check endpoint'lerini test etmek
- Otomasyon öncesi OAuth consent ekranlarını incelemek
- Mid-debug hata sayfalarını uygulamadan çıkmadan doğrulamak
