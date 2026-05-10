---
title: "+ Yeni İstek" butonuna sağ tıkla → protokol seçici
date: 2026-05-10
---

Yan menünün altındaki **+ Yeni İstek** butonu da klasör context
menüsüyle aynı protokol seçiciyi kazandı: sol tık HTTP default
(mevcut `⌘ N` shortcut'ıyla eşleşir), sağ tık beş seçenek açar —
HTTP / GraphQL / WebSocket / SSE / gRPC.

HTTP dışı bir seçenek aktif sekmeyi sıfırlar ve URL ön ekini
(`wss://` / `sses://` / `grpcs://`) + composer sekmesini hemen
doğru protokol-spesifik paneli gösterecek şekilde önceden doldurur.

Butonun tooltip'i ile keşfedilebilir ("Aktif sekmeyi sıfırla —
sağ tık ile WS/SSE/gRPC seçebilirsin"). Klavye shortcut'ı +
default-click davranışı değişmedi.
