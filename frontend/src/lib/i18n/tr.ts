// Turkish translations. This file is the SOURCE OF TRUTH for translation
// keys — every other locale must mirror its key set. TypeScript will fail
// the build if a translation file is missing keys defined here.

export const tr = {
  "lang.label": "Dil",
  "lang.tr": "Türkçe",
  "lang.en": "English",

  "topbar.theme": "Tema",
  "topbar.theme.toast": "Tema: {name}",
  "topbar.envEdit": "Env...",

  "sidebar.tab.collections": "Koleksiyon",
  "sidebar.tab.history": "Geçmiş",
  "sidebar.section.saved": "Kayıtlılar",
  "sidebar.section.recent": "Son istekler",
  "sidebar.empty.collections": "Henüz kayıtlı istek yok",
  "sidebar.empty.history": "Henüz geçmiş yok",
  "sidebar.newRequest": "+ Yeni İstek",
  "sidebar.clearHistory": "Temizle",
  "sidebar.confirmClearHistory": "Geçmiş silinsin mi?",

  "composer.requestName": "İstek adı",
  "composer.save": "Kaydet",
  "composer.send": "Gönder",
  "composer.sending": "Gönderiliyor...",
  "composer.urlPlaceholder": "https://api.example.com/path  (env: {{vars}})",
  "composer.tab.params": "Params",
  "composer.tab.headers": "Headers",
  "composer.tab.auth": "Auth",
  "composer.tab.body": "Body",
  "composer.tab.graphql": "GraphQL",

  "kv.addParam": "+ Param ekle",
  "kv.addHeader": "+ Header ekle",
  "kv.addEnv": "+ Environment ekle",
  "kv.delete": "Sil",
  "kv.confirmDelete": "Silinsin mi?",

  "auth.type": "Tip",
  "auth.none": "Yok",
  "auth.bearer": "Bearer Token",
  "auth.basic": "Basic Auth",
  "auth.apikey": "API Key",
  "auth.user": "Kullanıcı",
  "auth.pass": "Parola",
  "auth.token": "Token",
  "auth.header": "Header",
  "auth.value": "Value",

  "body.mode.none": "Yok",
  "body.mode.json": "JSON",
  "body.mode.form": "x-www-form-urlencoded",
  "body.mode.raw": "Raw",
  "body.prettyFormat": "Pretty Format",
  "body.invalidJson": "Geçersiz JSON: {error}",

  "graphql.note": "Method otomatik POST, body application/json olarak gönderilir.",
  "graphql.query": "Query",
  "graphql.vars": "Variables (JSON)",

  "response.empty.title": "İstek atmaya hazır.",
  "response.empty.shortcuts": "Gönder · Kaydet · Yeni",
  "response.copy.body": "Body Kopyala",
  "response.copy.curl": "cURL Kopyala",
  "response.tab.body": "Body",
  "response.tab.headers": "Headers",
  "response.tab.raw": "Raw",
  "response.bodyCopied": "Body kopyalandı",
  "response.curlCopied": "cURL kopyalandı",
  "response.transport.title": "HTTP transport",

  "env.modal.title": "Environments",
  "env.minRequired": "En az 1 environment olmalı",
  "env.placeholderText": "key=value\nbase_url=https://api.example.com\ntoken=abc123",
  "env.saved": "Environments kaydedildi",
  "env.deleteEnv": "Sil",

  "toast.saved": "Kaydedildi",
  "toast.urlEmpty": "URL boş",
  "toast.networkError": "Hata: {msg}",
};
