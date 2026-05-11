---
title: Sekmeler URL'den otomatik isim alıyor
date: 2026-05-11
---

Yeni bir sekme henüz varsayılan adını taşıyorsa ("Yeni istek" /
"New request"), sekme şeridi artık URL'den türetilmiş bir etiket
gösterir — örn. üç aynı görünümlü "Yeni istek" yerine
`GET api.github.com/users/octocat`.

Görüntülenen ad tamamen görseldir; kayıtlı sekme adı değişmez.
Sekmeye çift tıklayıp yeniden adlandırdığınız (veya kaydedilmiş bir
koleksiyon isteğinden açtığınız) an sizin verdiğiniz ad galip gelir —
otomatik etiket sadece henüz adlandırmadığınız sekmeler için devreye
girer.

Şema (`http://`, `https://`, `wss://`, …) kırpılır, uzun URL'ler üç
nokta ile kesilir, böylece birden fazla sekme açıkken şerit okunur
kalır.
