---
title: Composer sekmelerinin tamamı artık içerik göstergesi taşıyor
date: 2026-05-12
---

Params ve Headers sekmelerinde içerik varken zaten küçük bir sayı
rozeti çıkıyordu; artık composer'ın geri kalan sekmeleri de aynı
bir-bakışta göstergeyi taşıyor:

- **Auth** — None dışında bir seçim yapıldığında rozetin üzerinde
  aktif auth türü görünür: "Bearer", "Basic", "Key", "OAuth".
- **Body** — body None değilse modu gösterir: "JSON", "Form", "Raw".
- **GraphQL** — sorgu girilmişse küçük bir nokta belirir.
- **Scripts** — pre-request ve/veya post-response bloklarında
  içerik varsa 1 veya 2 sayısı görünür.

Artık her sekmeye tıklamadan, sekme şeridine bakarak hangi sekmelerin
gizli içerik taşıdığını anlayabiliyorsun.
