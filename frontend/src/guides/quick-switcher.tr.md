---
title: Hızlı geçiş — istekler arasında hızlıca geçiş yap
group: Çalışma Alanı
order: 1
---

Her an **`⌘ P`** bas, hızlı geçiş paleti açılır. Üç bölüme
fuzzy-search yapan bir komut paleti:

- Açık sekmeler (üst)
- Kayıtlı koleksiyonlar (orta)
- Yakın geçmiş (alt)

Filtrelemek için yaz. `↑` / `↓` ile gez, `↵` aç, `Esc` kapat.

## Arama syntax'i

Eşleştirici akıllı substring scorer'dır:

- Düz metin name + URL + method'a bakar.
- `GET 401 login` bir login endpoint'inde 401 yanıtı arar.
- Tab isimleri koleksiyon isimlerinden öncelikli, böylece
  "üzerinde çalıştığım istek"i parça yazarak hemen bulursun.

## Multi-tab pattern'leri

- `⌘ T` — yeni boş sekme.
- `⌘ W` — aktif sekmeyi kapat.
- `⌘ 1` … `⌘ 9` — N. sekmeye direkt atla.
- Yan menüde bir isteğe sağ tıkla → **Yeni sekmede aç** —
  mevcut context'i kaybetmeden yeni sekmede aç.

Aktif environment + koleksiyonlar + geçmiş sekmeler arasında
paylaşılır; sadece request body / response sekme bazlıdır.
