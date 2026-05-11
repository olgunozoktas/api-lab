---
title: Sekme şeridi kaydırma çubuğu görünmez (yine kayar)
date: 2026-05-11
---

Çok sayıda sekme açıkken sekme şeridinin altında beliren yatay
kaydırma çubuğu artık gizli. Şerit kaymaya devam ediyor — trackpad
swipe, mouse wheel + shift veya middle-click drag çalışıyor — ama
görünür 10px'lik çubuk artık dikey alan yemiyor ve sekme satırının
temiz çizgisiyle rekabet etmiyor. Yerel Safari / Chrome sekme şeridi
görünümüyle uyumlu.

Yan ürün olarak iki global utility class geliyor (`.scrollbar-none`,
`.scrollbar-thin`) — diğer kompakt şeritlerde ileride kullanmak için.
Uygulamanın geri kalanındaki varsayılan 10px scrollbar değişmedi.
