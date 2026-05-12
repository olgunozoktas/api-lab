---
title: GraphQL Variables editörü artık geçersiz JSON'u işaretliyor
date: 2026-05-12
---

GraphQL composer sekmesindeki Variables editörüne, v0.2.25'te
body editörü için gelen aynı canlı durum satırı eklendi — boyut
bandıyla renklenmiş byte sayısı, ve JSON geçerlilik rozeti:

- **Yeşil tik · Geçerli JSON**, değişkenler parse oluyorsa.
- **Turuncu üçgen · Geçersiz JSON · &lt;mesaj&gt;**, olmuyorsa;
  tam parse hatası tooltip'te.

Sessiz bir başarısızlık yolunu kapatır — eskiden hatalı bir
Variables JSON gönderildiğinde wire'da sessizce `{}` olarak
yollanır, sorgunun neden eksik veri döndürdüğünü merak ederdin.
Artık hata Send'e basmadan görünür.
