---
title: Durum piline gelince sınıfının ne demek olduğunu görün
date: 2026-05-12
---

Yanıt **durum piline** gelmek artık mevcut `200 OK` / `404 Not Found`
etiketinin üstünde sınıfın sade Türkçe açıklamasını gösteriyor:

- **1xx** — bilgilendirme, sunucu hâlâ işliyor
- **2xx** — başarılı, istek alındı + kabul edildi
- **3xx** — yönlendirme, curl Max-redirects sınırına kadar otomatik takip eder
- **4xx** — istemci hatası, isteği sizin tarafınızda düzeltin
- **5xx** — sunucu hatası, sunucu loglarına bakın

Geçen-ms rozetine eklenen `cursor-help` jestiyle aynı. Bilmediği bir
kodu (`409`, `422`, `503`) gören biri uygulamadan çıkmadan ne olduğunu
anlayabilir.
