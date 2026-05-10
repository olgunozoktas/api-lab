---
title: Postman import — bring your collections over
group: Workspace
order: 2
---

API Lab speaks Postman v2.1 collection JSON. To import:

1. Click **Import** in the sidebar header.
2. Drag the `.json` file onto the dialog or pick it.
3. The collection lands as a folder under the sidebar, named after
   the source. Environment variables merge into the active
   environment.

## What survives the import

- Every request in the collection (URL, method, headers, query
  params, body, auth where supported).
- Folder structure (Postman folders → API Lab folders).
- Collection variables → environment variables.
- GraphQL requests are detected and routed to the GraphQL composer
  tab.

## Limitations

- Pre-request and test scripts use Postman's pm.\* sandbox; API Lab
  has its own sandbox (QuickJS, no `fetch` / `XHR`). Most simple
  scripts work; complex ones may need rewriting. The Scripts panel
  surfaces runtime errors inline.
- Binary bodies (file uploads) skip — backlog has a follow-up.
- Iteration runners (data-driven Postman runs) skip — backlog has
  a follow-up.

## After importing

- The wrapper folder collects all top-level requests so multiple
  imports don't pollute the root.
- Open any request and re-save (`⌘ S`) to migrate it into your
  preferred organization.
