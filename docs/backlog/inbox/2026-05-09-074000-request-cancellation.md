# Request cancellation + progress

GitHub Issue: [#18](https://github.com/olgunozoktas/api-lab/issues/18)

For long requests, allow user to cancel mid-flight. Show progress for streaming responses.

- Frontend: AbortController on fetch path; for native bridge, send `http.cancel({id})` command
- Native bridge handler: track in-flight curl PIDs by request id, send SIGTERM on cancel
- UI: "Cancel" button replaces "Send" while in-flight
- Streaming: detect `Transfer-Encoding: chunked` / `text/event-stream`, show streaming text
