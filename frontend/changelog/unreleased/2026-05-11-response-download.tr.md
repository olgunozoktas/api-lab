---
title: Yanıt body'sini dosya olarak indir
date: 2026-05-11
---

Yanıt başlığı bar'ı (body view'in üstündeki) **Body Kopyala** yanına
**İndir** butonu kazandı. Tıkla, yanıt body'sini bir dosyaya kaydet —
dosya adı yanıt status kodu + Content-Type uzantısından otomatik
türetilir (`response-200.json`, `response-404.html`,
`response-500.txt`, vb).

Kullanım alanları:

- Offline inceleme için config / data export JSON çekmek
- Bug raporları için hata sayfalarını yakalamak
- Destructive endpoint state'i flip etmeden snapshot biriktirmek

Blob in-browser oluşturulur (native bridge round-trip yok), bu yüzden
indirme anında olur ve HTTP transport modundan bağımsız çalışır.
