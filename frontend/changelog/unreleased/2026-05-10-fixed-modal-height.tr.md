---
title: Rehberler + Changelog modal'larının artık sabit yüksekliği var
date: 2026-05-10
---

Rehberler ve Changelog modal'ları aktif entry'nin uzunluğuna göre
büyüyüp küçülüyordu. Bir paragraflık rehberden tam v0.1.0
changelog'una geçmek rahatsız ediciydi çünkü modal aniden çok
yükselebiliyordu.

İkisi de artık `max-h-[88vh]` yerine `h-[88vh]` kullanıyor (her
zaman pencere yüksekliğinin %88'i). Uzun entry'ler modal içinde
scroll olur; kısa entry'ler altta nefes alma alanı bırakır.
Seçim değişikliğinde layout shift yok.
