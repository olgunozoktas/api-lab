/** Olgun Özoktaş geliştirdi · API Lab */
// GitHub — curated essentials. A hand-picked slice of the REST API:
// repositories, issues, pull requests, actions, and the authenticated
// user. Write endpoints carry a minimal JSON body skeleton.
import type { CuratedProvider } from "./types";

export const githubCurated: CuratedProvider = {
  baseUrl: "https://api.github.com",
  endpoints: [
    {
      group: "Repos",
      name: "List your repos",
      method: "GET",
      path: "/user/repos",
      description: "List repositories owned by the authenticated user.",
    },
    {
      group: "Repos",
      name: "Get a repo",
      method: "GET",
      path: "/repos/{owner}/{repo}",
      description: "Fetch a single repository.",
    },
    {
      group: "Repos",
      name: "Create a repo",
      method: "POST",
      path: "/user/repos",
      description: "Create a repository for the authenticated user.",
      body: {
        mode: "json",
        text: '{\n  "name": "my-repo",\n  "description": "",\n  "private": true\n}',
      },
    },
    {
      group: "Repos",
      name: "List branches",
      method: "GET",
      path: "/repos/{owner}/{repo}/branches",
      description: "List a repository's branches.",
    },
    {
      group: "Issues",
      name: "List repo issues",
      method: "GET",
      path: "/repos/{owner}/{repo}/issues",
      description: "List issues in a repository.",
    },
    {
      group: "Issues",
      name: "Create an issue",
      method: "POST",
      path: "/repos/{owner}/{repo}/issues",
      description: "Open a new issue.",
      body: {
        mode: "json",
        text: '{\n  "title": "Issue title",\n  "body": "",\n  "labels": []\n}',
      },
    },
    {
      group: "Issues",
      name: "Get an issue",
      method: "GET",
      path: "/repos/{owner}/{repo}/issues/{issue_number}",
      description: "Fetch a single issue by number.",
    },
    {
      group: "Issues",
      name: "Update an issue",
      method: "PATCH",
      path: "/repos/{owner}/{repo}/issues/{issue_number}",
      description: "Edit an issue's title, body, or state.",
      body: {
        mode: "json",
        text: '{\n  "title": "",\n  "body": "",\n  "state": "open"\n}',
      },
    },
    {
      group: "Pull requests",
      name: "List pull requests",
      method: "GET",
      path: "/repos/{owner}/{repo}/pulls",
      description: "List a repository's pull requests.",
    },
    {
      group: "Pull requests",
      name: "Create a pull request",
      method: "POST",
      path: "/repos/{owner}/{repo}/pulls",
      description: "Open a pull request from one branch into another.",
      body: {
        mode: "json",
        text: '{\n  "title": "PR title",\n  "head": "feature-branch",\n  "base": "main",\n  "body": ""\n}',
      },
    },
    {
      group: "Pull requests",
      name: "Get a pull request",
      method: "GET",
      path: "/repos/{owner}/{repo}/pulls/{pull_number}",
      description: "Fetch a single pull request by number.",
    },
    {
      group: "Actions",
      name: "List workflow runs",
      method: "GET",
      path: "/repos/{owner}/{repo}/actions/runs",
      description: "List GitHub Actions workflow runs for a repository.",
    },
    {
      group: "User",
      name: "Get the authenticated user",
      method: "GET",
      path: "/user",
      description: "Fetch the profile of the token's owner.",
    },
  ],
};
