---
title: Pre / post-request script'ler — pm.* sandbox
group: Otomasyon
order: 1
---

Composer'daki **Scripts** alt-sekmesi istek gitmeden önce
(pre-request) ve yanıt geldikten sonra (post-response / test)
JavaScript çalıştırır. Script'ler QuickJS sandbox içinde
Postman uyumlu `pm.*` API subset ile çalışır.

## Pre-request — gönderme öncesi mutate et

```js
// Env state'ine göre dinamik bir header set et
pm.request.headers.add({
  key: "X-Trace-Id",
  value: pm.variables.get("trace_id") + "-" + Date.now(),
});

// Body'i koşullu olarak override et
if (pm.environment.get("env_name") === "staging") {
  pm.request.body.update("{}"); // staging probe'ları için body boşalt
}
```

Pre-request script'leri:

- Env + koleksiyon değişkenlerini oku/yaz
- Request header / params / body mutate et
- İmza / HMAC hesapla (network erişimi yok)

## Post-response — assert + extract

```js
pm.test("status 200", () => {
  pm.expect(pm.response.code).to.equal(200);
});

pm.test("body'de user id var", () => {
  const j = pm.response.json();
  pm.expect(j.user.id).to.be.a("string");
  pm.environment.set("user_id", j.user.id);
});
```

Post-response script'leri:

- `pm.test(name, fn)` assertion'ları çalıştır — pass/fail tally
  panelde inline görünür
- Chained istekler için env değişkenlerine değer extract et
- `console.log()` Scripts panelinin sağ tarafındaki konsola

## Sandbox sınırları

- Script başına 5 saniye CPU bütçesi (hard timeout)
- 10 MB heap
- `fetch`, `XHR`, `eval`, DOM, IO yok — sadece senkron pm.\*
  çağrıları + standard JS (Math, JSON, Date, vs.)
- Her istek taze bir sandbox alır; ardışık send'ler arasında
  state sızmaz

Hatalar request flow'unu bloklamaz — runtime hata inline render
olur (kırmızı banner + stack), ama gerçek HTTP / WS / gRPC çağrısı
yine tamamlanır.
