# Resizable 3-pane layout

GitHub Issue: [#16](https://github.com/olgunozoktas/api-lab/issues/16)

Users want to resize the sidebar / composer / response columns. Currently fixed `240px 1fr 1fr`.

- `dnpm install react-resizable-panels`
- Persist sizes via Zustand → localStorage
- Min/max constraints per pane
- Keyboard support (arrow keys when divider focused)
- Reset to defaults via right-click menu on divider
