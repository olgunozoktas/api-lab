---
title: Markdown table'ları artık Rehberler + Changelog'da render oluyor
date: 2026-05-10
---

Body modları / Auth / Kod olarak kopyala rehberlerinde kullanılan
GFM tarzı table'lar (`| sütun | sütun |\n|---|---|\n| a | b |`)
tek satırlık raw metin olarak render oluyordu — in-app markdown
subset renderer'ında table desteği yoktu, pipe satırları büyük tek
paragrafa toplanıyordu.

Düzeltildi: renderer artık header satırı + hemen `|---|---|`
ayırıcı tespit ediyor ve sonraki pipe satırlarını table verisi
olarak parse ediyor. Hücreler paragraflar gibi inline transformer'dan
geçer, böylece `**kalın**` / `` `kod` `` / `[link'ler](url)` table
hücrelerinde çalışır.

Hem GuideCard hem ChangelogEntryCard prose bloklarına Tailwind
stili eklendi: çerçeveli table, elev-bg arka planlı kalın
header'lar, eşit satır aralıkları, son satır border'sız.

Ayırıcısız tek satırlık `| solo |` hâlâ paragraf olarak render
olur (böylece table olmayan pipe içerik yanlışlıkla tek hücreli
table'a dönüşmez). Hücre hizalama işaretleri (`:---:`, `---:`,
`:---`) ayırıcıda kabul edilir ama render zamanında henüz
uygulanmaz.
