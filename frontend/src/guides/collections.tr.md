---
title: Koleksiyonlar — istekleri klasörlerde organize et
group: Çalışma Alanı
order: 0
---

Yan menüdeki **Collections** sekmesi kayıtlı istekler için
persistent ev. Postman workspace'i gibi düşün: reload'da hayatta
kalan klasör + istek ağacı.

## Bir isteği kaydetme

1. Composer'da isteği kur.
2. `⌘ S` bas (veya **Kaydet**'e tıkla).
3. İlk kayıt top-level entry yaratır; sonraki kayıtlar onu
   in-place günceller (`id` aynı kalır, parent + order korunur).

## Klasörler

- Yan menü başlığındaki **+ Klasör** auto-name'li (`Yeni klasör`)
  bir kök-seviye klasör yaratır. Hemen yaz, rename — `↵` kabul,
  `Esc` iptal.
- **Sağ tık → Yeni alt klasör** herhangi bir klasörün altına
  nested.
- **Sağ tık → Yeni istek** klasörün içine boş bir istek bırakır
  ve composer'ı ona switch eder.
- Bir isteği veya klasörü başka bir klasörün üzerine **sürükle**
  taşı (hedef klasör otomatik açılır).
- Sürükleme cycle-guard'lı — bir klasörü kendi descendant'larından
  birine bırakamazsın.

## Inline rename + sil

- İsme **çift tıkla** rename moduna gir.
- **Sağ tık → Sil** confirmation modal ile.
- Klasör silindiğinde içindeki tüm çocukları da götürür (klasör
  adıyla confirm prompt).

## Arama

Ağaç üstündeki search bar görünen node'ları name + URL üzerinden
canlı filtreler. Match içeren klasörler açık kalır; eşleşmeyenler
kaybolur. `✕` ile temizle.
