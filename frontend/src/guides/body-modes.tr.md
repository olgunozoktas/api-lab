---
title: Body modları — JSON, form, raw, multipart, binary
group: Composer
order: 3
---

Composer'daki **Body** alt-sekmesi altı mod sunar:

| Mod                     | Şu olarak gönderir                  | Editör                       |
| ----------------------- | ----------------------------------- | ---------------------------- |
| `Yok`                   | (body yok)                          | —                            |
| `JSON`                  | `application/json`                  | CodeMirror, JSON-doğrulamalı |
| `x-www-form-urlencoded` | `application/x-www-form-urlencoded` | KV tablo                     |
| `multipart/form-data`   | `multipart/form-data`               | Alan tablosu + dosya seçici  |
| `Binary`                | dosyanın tipi (uzantıdan)           | Tek dosya seçici             |
| `Raw`                   | `Content-Type` ne ayarlandıysa      | CodeMirror plain             |

## JSON modu

JSON syntax highlight'lı CodeMirror 6 editörü. **Pretty Format**
in-place yeniden indent eder — paste sonrası faydalı. Validation
hata pill'i bozuk JSON için satır + kolon gösterir, parse olana
kadar istek gönderilmez.

`{{var}}` substitution JSON metni üzerinde validation _sonrası_
çalışır, böylece değişken değerleri tırnak, escape, herhangi bir
karakter içerebilir — wire'a giden byte'lara aynen düşer.

## Form-urlencoded modu

Altında **+ Param ekle** olan KV tablo. Her satırda enable
checkbox (silmeden skip etmek için işareti kaldır). Param
değerleri otomatik URL-encode edilir; `{{var}}` substitution
encoding'den önce çalışır.

## multipart/form-data modu

Dosya yüklemeleri ve karışık form post'ları için. Body'i alan alan
kur: her satır bir ad artı ya satır içi bir metin değeri ya da
diskten bir dosya — satırı **ataç** butonuyla ikisi arasında
değiştir. API Lab gerçek bir multipart isteği gönderir; boundary'yi
curl yönetir, bu yüzden kendin `Content-Type` header'ı set etme.

## Binary modu

Diskten tek bir dosya seç ve ham request body olarak gönder —
image host'ları, doküman parser'ları, S3 `PUT` vb. için.
`Content-Type` dosya uzantısından otomatik doldurulur; gerekirse
**Headers** alt-sekmesinden override et.

Dosya parçaları (multipart dosyaları + binary body'ler) native
request path tarafından doğrudan diskten okunur, bu yüzden büyük
bir yükleme uygulamanın JS bridge'inden geçmek zorunda kalmaz.
Dosya yüklemeleri masaüstü uygulamayı gerektirir — tarayıcı yerel
dosya yollarını okuyamaz.

## Raw modu

Diğer her şey için — XML, CSV, custom format'lar vs.
**Headers** alt-sekmesinde set ettiğin `Content-Type` sunucunun
body'i nasıl yorumlayacağını belirler. JSON modunun validator'ı
fazla strict olduğunda boş `{}` JSON body göndermek için raw modu
da kullanışlı.

## Ne persist olur

Body içeriği request snapshot'ın bir parçası. `⌘ S` ile kaydettiğinde
body de isteğin geri kalanıyla persist olur ve sonraki session'da
aynı şekilde reload olur.
