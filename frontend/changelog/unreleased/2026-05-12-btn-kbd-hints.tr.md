---
title: Send + Save butonları kısayollarını gösteriyor
date: 2026-05-12
---

**Gönder** butonunun içinde küçük soluk bir `⌘ ↵` çipi, **Kaydet**
butonunun içinde `⌘ S` — butona uzanırken klavye kısayolu zaten
gözünüzün önünde. Hover tooltip'lerine de açık bir "(⌘+↵)" /
"(⌘+S)" eklendi; kısayol iki şekilde de keşfedilebilir.

Çip, UrlBar.tsx'ten dışa aktarılan yeni minik `KbdHint` helper
component'i kullanıyor — gelecekteki herhangi bir aksiyon butonu
aynı görünümü tek satırla ekleyebilir.
