---
title: Geçmişi duruma göre filtrele
date: 2026-05-11
---

Geçmiş kenar çubuğuna beş filtre pili eklendi — **Hepsi**, **2xx**,
**3xx**, **4xx**, **5xx**. Tek tıkla görünür kayıtları tek bir durum
sınıfına daraltabilirsiniz; debug seansında "sadece az önce aldığım
500'leri göster" demek için her başarılı isteği geçmek zorunda
değilsiniz. Filtreler arama kutusuyla birleşir: `/users` yazıp
**5xx**'e tıklayın, sadece 5xx dönen `/users` isteklerini görürsünüz.

Aktif pil vurgulanır; **Hepsi** ile temizleyin. Filtre durumu
oturum başına geçerlidir — yarın açtığınızda dünden kalma bir 4xx
filtresi sizi karşılamaz.
