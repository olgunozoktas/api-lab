---
title: Body modları — JSON, form-encoded, raw
group: Composer
order: 3
---

Composer'daki **Body** alt-sekmesi dört mod sunar:

| Mod                     | Şu olarak gönderir                  | Editör                       |
| ----------------------- | ----------------------------------- | ---------------------------- |
| `Yok`                   | (body yok)                          | —                            |
| `JSON`                  | `application/json`                  | CodeMirror, JSON-doğrulamalı |
| `x-www-form-urlencoded` | `application/x-www-form-urlencoded` | KV tablo                     |
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

## Raw modu

Diğer her şey için — XML, CSV, multipart fragment'lar vs.
**Headers** alt-sekmesinde set ettiğin `Content-Type` sunucunun
body'i nasıl yorumlayacağını belirler. JSON modunun validator'ı
fazla strict olduğunda boş `{}` JSON body göndermek için raw modu
da kullanışlı.

## Ne persist olur

Body içeriği request snapshot'ın bir parçası. `⌘ S` ile kaydettiğinde
body de isteğin geri kalanıyla persist olur ve sonraki session'da
aynı şekilde reload olur.
