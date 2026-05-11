---
title: Sekmeye sağ tıkla → Kapat · Çoğalt · Diğerlerini kapat · Sağdakileri kapat
date: 2026-05-11
---

Composer üstündeki sekme şeridi browser tarzı bir sağ tık context
menüsü kazandı, dört entry:

- **Sekmeyi kapat** — hover'daki ✕ veya orta-tık ile aynı.
- **Sekmeyi çoğalt** — isteği (URL, method, header, body, auth,
  script) hemen kaynaktan sonraki taze sekmeye klonlar; çoğaltma
  aktif olur. "Aynı isteği bir header düzeltilmiş haliyle dene"
  iş akışları için kullanışlı.
- **Diğer sekmeleri kapat** — şeridi sadece sağ tıklananın
  üstüne daraltır. Tek sekme açıkken disabled.
- **Sağdaki sekmeleri kapat** — anchor'dan sonraki her şeyi
  düşürür. En sağdaki sekmede disabled.

Aktif sekmedeki canlı edit'ler close öncesi duplicate / kalan
sekmeye snapshot'lanır, böylece tutmak istediğin sekmenin
etrafındakileri kaparken kaydedilmemiş değişiklikler kaybolmaz.
