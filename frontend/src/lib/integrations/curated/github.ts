/** Olgun Özoktaş geliştirdi · API Lab */
// GitHub — curated essentials. A hand-picked slice of the REST API:
// repositories, issues, pull requests, actions, and the authenticated
// user.
import type { CuratedProvider } from "./types";

export const githubCurated: CuratedProvider = {
  baseUrl: "https://api.github.com",
  endpoints: [
    { group: "Repos", name: "List your repos", method: "GET", path: "/user/repos" },
    { group: "Repos", name: "Get a repo", method: "GET", path: "/repos/{owner}/{repo}" },
    { group: "Repos", name: "Create a repo", method: "POST", path: "/user/repos" },
    {
      group: "Repos",
      name: "List branches",
      method: "GET",
      path: "/repos/{owner}/{repo}/branches",
    },
    {
      group: "Issues",
      name: "List repo issues",
      method: "GET",
      path: "/repos/{owner}/{repo}/issues",
    },
    {
      group: "Issues",
      name: "Create an issue",
      method: "POST",
      path: "/repos/{owner}/{repo}/issues",
    },
    {
      group: "Issues",
      name: "Get an issue",
      method: "GET",
      path: "/repos/{owner}/{repo}/issues/{issue_number}",
    },
    {
      group: "Issues",
      name: "Update an issue",
      method: "PATCH",
      path: "/repos/{owner}/{repo}/issues/{issue_number}",
    },
    {
      group: "Pull requests",
      name: "List pull requests",
      method: "GET",
      path: "/repos/{owner}/{repo}/pulls",
    },
    {
      group: "Pull requests",
      name: "Create a pull request",
      method: "POST",
      path: "/repos/{owner}/{repo}/pulls",
    },
    {
      group: "Pull requests",
      name: "Get a pull request",
      method: "GET",
      path: "/repos/{owner}/{repo}/pulls/{pull_number}",
    },
    {
      group: "Actions",
      name: "List workflow runs",
      method: "GET",
      path: "/repos/{owner}/{repo}/actions/runs",
    },
    { group: "User", name: "Get the authenticated user", method: "GET", path: "/user" },
  ],
};
