---
title: ⌘⇧T son kapatılan sekmeyi geri açar
date: 2026-05-11
---

`⌘ + Shift + T` bas, az önce kapattığın sekmeyi geri getir — aynı
browser-standard shortcut. Tam state ile geri açar: URL, method,
header, body, auth, yanıt (varsa). 10 derinliğe kadar stack —
"sağdakileri kapat"tan sonra peşpeşe pop'layabilirsin.

Recently-closed stack session-bound (in-memory, persist yok) —
Chrome / Safari davranışıyla eşleşir. Kapanan sekmedeki canlı
unsaved edit'ler önce stack'e snapshot'lanır, böylece reopen
kayıtlı isteğe fallback yapmaz, aynen geri yükler.

Shift olmadan `⌘ T` hâlâ taze boş sekme açar; Shift modifier
tek anahtar.
