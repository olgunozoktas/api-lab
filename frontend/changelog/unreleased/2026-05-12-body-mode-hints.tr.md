---
title: Body paneli: her modun ne gönderdiğini açıklayan ipucu
date: 2026-05-12
---

Auth paneline yapılanın aynısı — istek **Body** paneli artık mod
dropdown'unun hemen altında, seçilen modun ağ üzerinde ne ürettiğini
açıklayan tek satırlık küçük bir ipucu gösteriyor:

- **Yok** — body gönderilmez, `Content-Type` eklenmez. GET / HEAD
  için kullanın.
- **JSON** — body `Content-Type: application/json` ile gönderilir,
  Pretty Format yeniden biçimlendirir, `{{var}}` referansları istek
  atılırken değiştirilir.
- **x-www-form-urlencoded** — `key1=value1&key2=value2` formatı,
  eşleşen content-type ile gönderilir; HTML form post'larını
  taklit eder.
- **Raw** — body olduğu gibi gönderilir; XML / plain text / custom
  format için `Content-Type` header'ını siz belirleyin.

İpucu, mevcut Auth modu ipucunun kardeşi — composer'ın iki sekmesi
de tutarlı hissettiriyor.
