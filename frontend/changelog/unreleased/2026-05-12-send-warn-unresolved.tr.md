---
title: Send butonu, URL'de tanımsız `{{var}}` varsa uyarı veriyor
date: 2026-05-12
---

URL'de aktif ortamda tanımsız en az bir `{{var}}` varsa, Send
butonundaki kağıt-uçak ikonu yerini uyarı rengindeki küçük bir
üçgen uyarı ikonuna bırakıyor. Butonun üzerine gelirsen sebebi
tooltip'te okuyabilirsin — URL önizlemesinde gördüğün tanımsız
değişken ipucunun aynısı.

v0.2.6'da gelen, önizleme satırındaki kırmızı `{{var}}` rozetiyle
birlikte çalışır: uyarı, Send'e basıp istek literal `{{userId}}`
ile gittikten *sonra* değil, *önce* görünür.
