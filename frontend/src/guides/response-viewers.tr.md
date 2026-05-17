---
title: Yanıt görüntüleyicileri — görsel, ses, video, PDF
group: Composer
order: 6
---

Bir yanıt metin değilse, API Lab byte'ları replacement karakterlere
bozmak yerine onu önizler. Native request bridge binary yanıtları
bozulmadan taşır ve **Body** sekmesi doğru görüntüleyiciyi otomatik
seçer.

## Ne render edilir

| Yanıt tipi                                | Görüntüleyici                       |
| ----------------------------------------- | ----------------------------------- |
| Görseller (PNG, JPEG, GIF, WebP, AVIF, …) | Satır içi görsel                    |
| Ses                                       | Oynatma çubuğu                      |
| Video                                     | Satır içi oynatıcı                  |
| PDF                                       | Sayfa sayfa, önceki / sonraki       |
| Diğer her binary                          | Hex görüntüleyici (gerçek byte'lar) |

Görüntüleyici, yanıtın `Content-Type`'ı artı byte'ların bir
incelemesinden seçilir, böylece yanlış etiketlenmiş bir yanıt bile
doğru yere düşer.

## İndirme

Bir binary yanıtı indirmek **byte-aynı** bir dosya kaydeder —
kaydedilen bir PNG veya PDF'i aç, sorunsuz çalışır.

## Boyut sınırı

Native bridge binary body'leri ~720 KB'a kadar taşır. Daha büyük
bir binary yanıt, sessizce başarısız olmak yerine net bir
"önizlemek için fazla büyük" notu gösterir — istek yine başarılı
oldu; yalnızca uygulama içi önizleme sınırlı.
