---
title: Postman import — koleksiyonlarını taşı
group: Çalışma Alanı
order: 2
---

API Lab Postman v2.1 koleksiyon JSON'u anlar. Import etmek için:

1. Yan menüde **Import**'a tıkla.
2. `.json` dosyasını dialog'a sürükle veya seç.
3. Koleksiyon yan menüde kaynak adıyla bir klasör olarak iner.
   Environment değişkenleri aktif environment'a merge edilir.

## Import edilenler

- Koleksiyondaki her istek (URL, method, headers, query params,
  body, auth — destekleniyorsa).
- Klasör yapısı (Postman folder → API Lab folder).
- Koleksiyon değişkenleri → environment değişkenleri.
- GraphQL istekleri algılanır ve GraphQL composer sekmesine yönlendirilir.

## Sınırlamalar

- Pre-request ve test script'leri Postman'in pm.\* sandbox'ını
  kullanır; API Lab'in kendi sandbox'ı (QuickJS, `fetch` / `XHR`
  yok). Çoğu basit script çalışır; karmaşık olanlar yeniden
  yazılması gerekebilir. Scripts paneli runtime hatalarını
  inline gösterir.
- Binary body'ler (file upload) skip edilir — backlog'da follow-up.
- Iteration runner'lar (data-driven Postman koşumları) skip
  edilir — backlog'da follow-up.

## Import sonrası

- Wrapper folder tüm top-level istekleri toplar, böylece birden
  fazla import root'u kirletmez.
- Herhangi bir isteği aç ve `⌘ S` ile yeniden kaydet — kendi
  organizasyonuna migrate et.
