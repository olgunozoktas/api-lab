---
title: Yan menüde klasöre sağ tıkla → içine yeni istek ekle
date: 2026-05-10
---

Koleksiyonlar yan menüsündeki klasör context menüsü **Yeni alt
klasör**'ün üstüne **Yeni istek** entry'si kazandı. Herhangi bir
klasöre sağ tıkla, **Yeni istek** seç — boş bir istek o klasörün
altına direkt iner + composer'da aktif istek olur, edit etmeye
hazır.

Klasör otomatik açılır, böylece yeni entry ekstra tıklama olmadan
görünür.

Yan menüsü altındaki mevcut **+ Yeni İstek** butonu ile aynı
flow, fakat o aktif sekmede unsaved boş yaratır; bu hedeflenen
klasöre hemen persist eder, böylece açık save adımı olmadan
reload'da kalır.
