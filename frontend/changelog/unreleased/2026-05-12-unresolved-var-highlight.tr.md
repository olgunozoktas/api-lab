---
title: Çözümlenmemiş `{{var}}` ifadeleri URL önizlemesinde kırmızıyla
date: 2026-05-12
---

URL çubuğunun altındaki çözümlenmiş URL satırı, artık aktif ortamda
tanımsız olan `{{var}}` referanslarını kırmızıyla (hafif kırmızı zemin
ile) gösteriyor. Bir değişken adındaki yazım hatası veya ortama
eklemeyi unuttuğun bir anahtar, Send'e basmadan hemen göze çarpıyor.

Önizleme satırı, görünür URL değişmese bile en az bir tanımsız
referans varsa görünür hâle gelir — yani eksik anahtarlar artık
sessizce kaybolmuyor. Kırmızı parçanın üzerine gel, tooltip'te
değişkenin tam adı çıkıyor.
