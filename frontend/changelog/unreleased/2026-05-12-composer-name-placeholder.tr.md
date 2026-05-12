---
title: Composer istek adı, otomatik türetilmiş kayıt adını gösteriyor
date: 2026-05-12
---

Aktif sekme hâlâ varsayılan adını (`Yeni istek` / `New request` /
`Untitled`) taşıyorsa, composer'ın tepesindeki istek adı kutusu
artık boş görünür ve placeholder olarak otomatik türetilmiş
`METHOD shortUrl`'yi gösterir — `⌘+S`'in koleksiyona ne adla
kaydedeceğinin önizlemesi. İmleci kutunun üzerine tutarsanız aynı
önizleme tooltip'te görünür ("⌘+S basarsanız `GET api.test/users`
olarak kaydedilir").

Bir şey yazınca öneri yerini sizin değerinize bırakır. Manuel
adlandırılmış sekmeler değerini olduğu gibi gösterir — değiş tokuş
yalnızca varsayılan adlarda devreye girer, yani özel adlarınız
placeholder'ın arkasında kaybolmaz.

Otomatik-adlandırma döngüsünü kapatıyor: sekme şeridi, kenar çubuğu
satırı, composer adı kutusu ve `⌘+S` artık aynı türetilmiş etiketi
gösteriyor / commit ediyor.
