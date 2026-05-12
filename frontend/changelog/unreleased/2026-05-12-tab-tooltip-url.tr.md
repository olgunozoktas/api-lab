---
title: Sekme tooltip'i etiket + tam METHOD URL gösteriyor
date: 2026-05-12
---

Sekme şeridindeki bir sekmenin üzerine gelmek eskiden sadece
kırpılmış etiketi gösterirdi — görünen metin zaten kesilmişse
çok da işe yaramazdı. Tooltip artık iki satır gösteriyor:

```
GET api.test/users/octocat
GET https://api.test/users/octocat
```

İlk satır, sekmede görünen etiketin aynısı. İkinci satır kırpılmamış
tam `METHOD URL`. İkisi aynıysa (nadiren, çok kısa URL'lerde) tek
satır gösterilir.

Birkaç sekme aynı domain'i paylaştığında, her birine tıklamadan
ayırt edebilmek için pratiktir.
