# Multipart + binary body support

Native HTTP handler currently sends body as JSON-encoded UTF-8 string. Doesn't handle:
- multipart/form-data (file uploads)
- Binary payloads (protobuf, images, etc.)

Plan:
- Frontend body editor: file picker tab → list of {name, file, contentType}
- Send via bridge: write each file to /tmp, pass refs to Zig handler
- Zig handler: invoke curl with `--form name=@/tmp/...;type=...` flags
- Response: detect Content-Disposition / binary content-type, offer "Save as..." or "View as image"
