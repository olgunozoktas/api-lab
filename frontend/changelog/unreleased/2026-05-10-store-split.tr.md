---
title: Store internal'larını slice başına bölündü
date: 2026-05-10
---

İçsel refactor (kullanıcı görünür delta yok) —
`frontend/src/store/index.ts` 643 LOC'tu, projenin 400-LOC hard
cap'inin epey üstünde. Zustand'ın slice-composition pattern'i ile
sekiz domain başına slice dosyasına bölündü. `index.ts` artık
80 LOC'luk ince bir composition root.

Kullanıcı persisted state (koleksiyonlar, environment'lar, geçmiş,
sekmeler, preferences) etkilenmedi — persist contract aynen
korundu. Migration gerekmedi; v3 snapshot upgrade'den önceki gibi
yüklenir.
