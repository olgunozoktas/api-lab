---
title: Değişken olarak kaydet — yanıttan sonraki isteğe zincirle
group: Otomasyon
order: 0
---

Bir istek geldikten sonra, yanıttan herhangi bir değeri sonraki
isteklerde kullanmak için bir environment değişkenine extract
edebilirsin — script gerekmez.

## Nasıl

1. Bir istek gönder (örn. `{ "access_token": "..." }` döndüren
   bir login).
2. Yanıt **Body** panelinde, almak istediğin değere sağ tıkla.
3. **Değişken olarak kaydet...** seç.
4. Değişkeni adlandır (`access_token`), environment'ı seç, kaydet.

Toast `"<name>" → <env> environment'ına kaydedildi` ile onaylar.
Değişken hemen aktif environment'a düşer.

## Kullanma

`{{var}}` substitution'ın çalıştığı her yerde (URL, header, params,
body):

```
Authorization: Bearer {{access_token}}
```

Substitution gönderme anında **aktif** environment'a karşı
yapılır, yani environment değiştirmek değeri swap eder.

## Neden script'lerden iyi

- QuickJS sandbox uğraşı yok
- Script panel boilerplate yok
- Herhangi bir yanıttan çalışır (HTTP, GraphQL, gRPC unary bile)
- Görünür — değişken env editöründe yaşar, görebilir + edit
  edebilir + diğer değişkenler gibi silebilirsin

## Ön koşul

Kaydedeceğin en az bir environment'ın olmalı. Yoksa, üst bardaki
**Env...** butonuna tıklayıp yarat. Olmadan, "Değişken olarak
kaydet" dialogu önce bir environment kurman gerektiğini
hatırlatır.
