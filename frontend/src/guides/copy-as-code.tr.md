---
title: Kod olarak kopyala — bir isteği tek satır olarak paylaş
group: Çalışma Alanı
order: 3
---

Yanıt panelinin üstündeki **Kod Kopyala** dropdown'u aktif
isteği altı dil / formatta paste-ready kod olarak export eder:

| Format              | Kullanım                      |
| ------------------- | ----------------------------- |
| `cURL`              | Chat / docs / Slack'te paylaş |
| `JS fetch`          | Tarayıcı konsolu tek satır    |
| `JS XMLHttpRequest` | Legacy tarayıcı kodu          |
| `Node axios`        | Backend script template'i     |
| `Python requests`   | Notebook'ta hızlı tekrar      |
| `Go net/http`       | Backend service başlangıcı    |

Export edilen kod **tam çözümlenmiş** olur:

- `{{vars}}` aktif environment'a göre genişletilir.
- Auth inline uygulanır (Bearer header materialize edilir,
  Basic Auth base64 encode edilir, vs.).
- Body set ettiğin format moduyla render edilir (JSON pretty,
  form-encoded olarak `key=value&...`, raw aynen geçirilir).
- Headers aynen taşınır.

Pop-up `{lang} kopyalandı` toast ile onaylar.

## cURL yanlış olduğunda

Bazı sunucular curl bazı default header'ları (`Accept-Encoding: gzip`,
`User-Agent: api-lab/0.1`) bypass ettiğinde farklı davranır.
Reproduction'ın aynı byte'lara ihtiyacı varsa, **Headers**
alt-sekmesini kontrol et — API Lab'in otomatik gönderdiği ama
aşağı tüketicinin göndermediği şeyleri açıkça ekle.

## Tersine — URL bara curl yapıştır

URL alanına `curl ...` komutu bırak, banner parse etmeyi öneriyor:
method, URL, headers (`-H`), body (`-d` / `--data`), basic auth
(`-u`), insecure (`--insecure`), follow-redirects (`-L`) hepsi
populate edilir. Birisi chat'te "şekil bu, sadece token'ını
yerleştir" curl'u yapıştırdığında faydalı.
