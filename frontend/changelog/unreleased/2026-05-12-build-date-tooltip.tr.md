---
title: Sürüm rozeti tooltip'inde + Ayarlar → Hakkında'da derleme zamanı
date: 2026-05-12
---

Üst çubuktaki `v0.2.1` rozeti artık üzerine gelindiğinde bundle'ın ne
zaman derlendiğini gösteriyor — Vite her derlemede `__BUILD_DATE__`'i
(ISO-8601, config yükleme zamanında alınır) ekliyor ve rozet tooltip'i
locale'inizin tarih/saat formatında render ediyor.

**Ayarlar → Hakkında**'da platform / native shell / frontend / storage
listesine eşleşen bir **Derleme zamanı** satırı eklendi. İki yerel
build'i karşılaştırırken veya "az önce ürettiğim binary bu mu?"
sorusunu yanıtlarken işe yarar.
