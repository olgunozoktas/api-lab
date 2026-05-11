---
title: Auth paneli: her modun ne yaptığını açıklayan ipucu
date: 2026-05-12
---

Auth tipi seçince önceden bağlamsız bir input dizisi karşılardı. Panel
artık tip dropdown'unun hemen altında, seçilen modun ağ üzerinde ne
ürettiğini açıklayan tek satırlık küçük bir ipucu gösteriyor —
`Bearer` → `Authorization: Bearer <token>`, `Basic` → `user:pass`'in
base64 hâli, `API Key` → seçtiğiniz header adı + değeri, `OAuth 2.0`
→ grant akışı + önbelleğe alınan `Bearer` + otomatik refresh.

Değerin header'a mı, body'ye mi yoksa hiçbir yere mi gitmediği
artık tahmin meselesi değil.
