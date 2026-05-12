---
title: Kayıtlı istek satırlarında da artık "URL'yi kopyala" / "cURL olarak kopyala" var
date: 2026-05-12
---

Sidebar'daki herhangi bir kayıtlı isteğe sağ tıkla — bağlam menüsü,
v0.2.18'de history satırlarında gelen **URL'yi kopyala** ve
**cURL olarak kopyala** aksiyonlarını da kazandı. Aynı oluşturucu
hattı: env-ikame edilmiş URL, auth başlıklara katlanır, body
iliştirilir (GET/HEAD için atlanır), content-type ayarlanır.

Kayıtlı bir isteğin tekrarlanabilir komutunu, aktif sekmeye
yüklemeden ya da yanıt başlığındaki Copy-as menüsünü açmadan
paylaşmanın hızlı yolu.
