---
title: Yanıt Headers sekmesini filtrele
date: 2026-05-11
---

**Headers** sekmesinin tepesine bir filtre alanı eklendi. `cache`,
`cors`, `x-` veya başka bir alt dize yazın — hem header adına hem
de değerine karşı eşleşir — tablo yalnızca bu satırlara daralır.
30+ header taşıyan bir CDN yanıtında tek bir `cache-control`
direktifini ya da `access-control-*` kuralını hızlıca bulmak için
işe yarar.

Filtre sekme başına geçerlidir (sekme değişince sıfırlanır) ve
yalnızca gördüğünüzü daraltır — yanıtın kendisi değişmez.
