---
title: GraphQL paneli: Query / Variables daha derli toplu
date: 2026-05-11
---

GraphQL paneli, Query editörü için 180px ve Variables editörü için
120px ayırırdı — uzun bir sorgu için iyiydi ama tek satırlık
`query { users { id name } }` ile sonuç, iki kutu arasında kocaman
bir boşluktu.

Minimum yükseklikler şimdi sırasıyla 120px ve 72px, Query ile
Variables arasındaki boşluk da bir tık daraltıldı. Her iki editör de
içerik büyüdükçe büyümeye devam ediyor; kaydırma veya düzenleme
davranışında değişiklik yok.
