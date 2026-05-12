---
title: Body editörünün altında canlı byte sayısı ve JSON geçerlilik rozeti
date: 2026-05-12
---

Body editörünün altına eklenen küçük durum satırı, kodlanmış byte
boyutunu (yanıt panelinin kullandığı aynı boyut-bandı paletiyle —
100 KB altı soluk, 1 MB'a kadar turuncu, ötesi kırmızı) ve **Body
modu = JSON** seçildiğinde geçerlilik rozetini gösterir: metin
parse oluyorsa tikle birlikte yeşil **Geçerli JSON**, parse
hatası varsa uyarı üçgeniyle turuncu **Geçersiz JSON · &lt;mesaj&gt;**.
Geçersiz rozetinin üzerine gel; tam parse hatası tooltip'te.

Body boşsa satır gizlenir — None modunda boş bir panel temiz kalır.
"Virgül unutmuşum"u Send'e basmadan ve Pretty Format'a tıklamadan
yakalar.
