---
title: Body Kopyala butonu kopya sonrası kısa bir tik gösteriyor
date: 2026-05-12
---

Yanıt başlığındaki **Body Kopyala** butonu, tıkladıktan sonra
~1,2 saniye boyunca kâğıt-ikonunu yeşil tikle değiştirir ve
"Kopyalandı" yazısını gösterir. Mevcut toast hâlâ tetiklenir;
buton içindeki tik, gözünün zaten odaklı olduğu yerde anında
geri bildirim sağlar.

Yeni minik `useCopyFeedback()` hook'u sayesinde aynı flash
örüntüsü, ileriki slice'larda response başlıkları tablosundaki
kopyalama butonları, history bağlam menüsündeki kopyalama
aksiyonları ve URL çubuğu kopya aksiyonlarında da kullanılabilir.
