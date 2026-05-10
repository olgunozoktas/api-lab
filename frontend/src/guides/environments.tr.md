---
title: Environment'lar — base URL ve token'lar arasında geçiş
group: Temel
order: 2
---

Environment'lar context'e özgü değişkenleri (farklı base URL'ler,
API anahtarları, OAuth token'ları) tutar. Aktif environment'ın
değişkenleri `{{var_name}}` syntax'i ile isteğine substitue edilir.

## Kurulum

1. Üst bardaki **Env...** butonuna tıkla.
2. Bir environment ekle (örn. `dev`, `staging`, `prod`).
3. Anahtar/değer çiftleri tanımla:
   ```
   base_url=https://api.dev.example.com
   token=eyJhbGc...
   ```
4. **Env...** yanındaki dropdown'dan aktif environment'ı seç.

## Değişkenleri kullanma

URL, header, query params veya body'nin herhangi bir yerinde:

```
GET {{base_url}}/users
Authorization: Bearer {{token}}
```

Substitution gönderme anında olur. Aktif environment'taki değerler
kullanılır; eksik anahtarlar `{{...}}` olarak literal kalır,
böylece eksiği fark edersin.

## Pratik ipuçları

- Postman koleksiyonu import edersen, değişkenler otomatik olarak
  yeni bir environment'a eklenir.
- Yanıttan değişken kaydet: yanıt panelinde değeri seç, sağ tıkla
  **Değişken olarak kaydet...** de, isim ver, aktif environment'a
  düşer.
- Mid-session environment değiştir — aktif dropdown tek tıkla.
