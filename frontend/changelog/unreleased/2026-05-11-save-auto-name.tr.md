---
title: ⌘S, varsayılan adlı isteği türetilmiş adla kaydeder
date: 2026-05-11
---

⌘S, varsayılan adlı bir isteği "Yeni istek" / "New request" olarak
kaydederdi — kenar çubuğu birbirinden ayırt edilemeyen satırlarla
dolardı. Artık sekme şeridi + kenar çubuğunun zaten gösterdiği
`METHOD shortUrl` türetimini uyguluyor — `GET https://api.test/users`
isteğini kaydetmek koleksiyonunuza `GET api.test/users` olarak iner;
isterseniz daha samimi bir etiketle yeniden adlandırabilirsiniz.

Sekmeyi manuel adlandırdıysanız sizin adınız galip gelir. Hem ad
hem URL boşsa, eski `(adsız)` yedeği aynen devam eder.
