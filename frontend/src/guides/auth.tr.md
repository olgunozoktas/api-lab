---
title: Auth — Bearer, Basic, API Key, OAuth 2.0 helper
group: Composer
order: 4
---

Composer'daki **Auth** alt-sekmesi gönderme öncesi isteğe
authentication uygular.

## Tip seçici

| Tip                  | Gönderilen header                                        |
| -------------------- | -------------------------------------------------------- |
| `Yok`                | —                                                        |
| `Bearer Token`       | `Authorization: Bearer {{token}}`                        |
| `Basic Auth`         | `Authorization: Basic base64(user:pass)`                 |
| `API Key`            | Custom header (adı sen seçersin)                         |
| `OAuth 2.0` (helper) | `Authorization: Bearer {{access_token}}` + Yenile butonu |
| `AWS SigV4`          | `Authorization: AWS4-HMAC-SHA256 …` + `X-Amz-Date`       |
| `mTLS`               | (TLS handshake'te client sertifikası — header yok)       |

`{{var}}` substitution her field üzerinde çalışır, böylece
`{{access_token}}` Bearer token alanı aktif environment'tan
çözümlenir.

## OAuth 2.0 helper varyantı

Tam OAuth flow'ları (PKCE + redirect interception + Keychain)
zero-native upstream değişikliği gerektiriyor — backlog'da
follow-up var. v1 çoğu setup için yeterli olan
**token-yapıştır-ve-refresh** helper'ı:

1. Herhangi bir dış araçla `access_token` al.
2. Auth panelindeki `Access token` field'ına yapıştır.
3. İsteğe bağlı: `refresh_token`, `token_url`, `client_id`,
   `client_secret` doldur (public client / PKCE için boş bırak).
4. **Yenile** butonu refresh credential'larıyla `token_url`'e
   istek atar ve access_token'ı in-place günceller.

Send `Authorization: Bearer <access_token>` ile otomatik fire eder.

## AWS Signature v4

AWS servisleri için — S3, API Gateway, Lambda function URL'leri,
SigV4 bekleyen her şey. **AWS SigV4**'ü seç ve doldur:

- **Access key ID** / **Secret access key** — IAM credential'ların.
- **Region** — örn. `us-east-1`.
- **Service** — örn. `s3`, `execute-api`.
- **Session token** — yalnızca geçici (STS) credential'lar için;
  diğer durumda boş bırak.

API Lab isteği gönderme öncesi lokal olarak imzalar: SigV4
canonical request'i kurar, signing key'i türetir ve `Authorization`,
`X-Amz-Date`, `X-Amz-Content-Sha256` header'larını ekler. Secret key
yalnızca lokal HMAC için kullanılır — uygulamadan hiç çıkmaz.
`{{var}}` substitution her field'da çalışır.

## mTLS (client sertifikası)

TLS handshake'te client sertifikası isteyen endpoint'ler için —
mutual TLS, internal servislerde yaygın. **mTLS**'i seç ve diskteki
PEM dosyalarını göster:

- **Client cert (PEM yolu)** — sertifika dosyasının yolu.
- **Client key (PEM yolu)** — private-key dosyasının yolu.
- **Key passphrase** — yalnızca key şifreliyse.

curl handshake sırasında sertifikayı sunar. mTLS yalnızca native
request path üzerinden çalışır — tarayıcının client-sertifikası
API'si yok.

## Credential'lar nerede yaşıyor

Her auth field'ı request snapshot'ın bir parçası, kayıtlı
istekle persist olur. `zero://app` origin'i altında IDB'de
saklanır — bu origin OS tarafından sadece bu uygulamaya
sandbox'lanır, ama yine de local credential gibi davran. Production
key'ler için `{{token}}` env-var indirection'ı tercih et —
böylece gerçek secret tek yerde (aktif environment) yaşar,
kayıtlı isteklerde tekrarlanmaz.
