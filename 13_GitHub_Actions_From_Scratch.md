# GitHub Actions from Scratch: Playwright CI Guide

This guide teaches GitHub Actions from the beginning and uses this Playwright automation framework as a practical example. It covers what Actions is, how a workflow runs, how to read the YAML, how to inspect a run on GitHub, and how to troubleshoot common failures.

## Learning Objectives

After this guide, students should be able to:

- Explain CI, CD, GitHub Actions, workflows, jobs, runners, steps, and artifacts.
- Find and read a workflow YAML file in a repository.
- Explain when this project's Playwright workflow starts and what it runs.
- Inspect a successful or failed workflow run in the GitHub UI.
- Identify basic configuration problems in a CI workflow.
- Describe how to add a manual workflow trigger or browser matrix.

## 1. What Is CI?

CI means **Continuous Integration**. Developers frequently push their code changes to a shared repository. An automated CI system can then build the project and run checks, such as linting and automated tests. The result helps the team discover problems soon after a change is made.

CD commonly means **Continuous Delivery** or **Continuous Deployment**. Those processes prepare or deploy software after the CI checks pass. This repository's GitHub Actions workflow runs tests; it does not deploy an application.

Without CI, a developer might run tests only on their own computer. With CI, GitHub can run the same configured checks on a clean, temporary computer whenever a configured event occurs.

## 2. What Is GitHub Actions?

GitHub Actions is GitHub's automation service. A repository stores workflow definitions as YAML files under:

```text
.github/workflows/
```

GitHub reads these files and starts the configured work when an event occurs. Examples of events include:
The GitHub runner is a Linux server without a desktop display, so CI should use headless browsers. The Playwright config reads `env.headless`, which defaults to headless mode and supports `HEADLESS=false` for a visible local browser. The workflow explicitly sets `HEADLESS: "true"` at the job level:

````yaml

- A commit is pushed to a branch.
- A pull request is opened or updated.
- A person manually starts a workflow, if the workflow defines a manual trigger.
- A scheduled time is reached, if a schedule is defined.
This corrects the previous hard-coded `headless: false` setting. If a future run still fails, read the expanded **Run Playwright tests** log to identify the actual test or browser error.
GitHub-hosted runners are temporary virtual machines that execute workflow jobs. A runner is not the developer's laptop and does not retain installed tools or files after the job ends, except for data explicitly saved as an artifact or cache.

## 3. Important Terms

| Term            | Meaning                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| Workflow        | The complete automation definition in a YAML file.                                                            |
| Event / trigger | The repository event that starts a workflow, such as `push`.                                                  |
| Job             | A group of steps that runs on a runner. Jobs can depend on other jobs.                                        |
| Runner          | The computer that executes a job, such as `ubuntu-latest`.                                                    |
| Step            | One action or shell command inside a job.                                                                     |
| Action          | A reusable component referenced with `uses`, such as checkout or artifact upload.                             |
| Artifact        | A file or folder saved from a workflow run so people can download it later.                                   |
| Secret          | An encrypted value, such as a token or password, provided to a workflow without putting it in source control. |
| Workflow run    | One execution of a workflow for a particular event or manual start.                                           |
| Matrix          | A configuration that repeats a job for combinations of values, such as multiple browsers or Node.js versions. |

## 4. The Workflow in This Repository

The project workflow is:

```text
.github/workflows/playwright.yml
````

The workflow currently:

1. Starts for pushes to `main` or `master` and for pull requests targeting either branch.
2. Creates one job on an Ubuntu GitHub-hosted runner.
3. Checks out the repository files.
4. Installs the Node.js LTS version and caches npm's package data.
5. Installs Playwright browsers and Linux system dependencies.
6. Runs `npm test`, which cleans prior output and starts Playwright.
7. Uploads the HTML report, Allure results, and Playwright test results as an artifact.

The workflow itself does **not** define a matrix. Playwright's [playwright.config.js](playwright.config.js) defines Chromium, Firefox, and WebKit projects. The single `npm test` command discovers those projects and runs the configured test suite across them.

## 5. Read the YAML Step by Step

Here is the current workflow, broken down by its purpose:

```yaml
name: Playwright Tests
```

`name` is the label shown in the GitHub Actions UI.

```yaml
on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]
  workflow_dispatch:
```

`on` defines the events that start the workflow. Here, a push to `main` or `master` starts it. A pull request targeting either branch also starts it. `workflow_dispatch` enables the **Run workflow** button in the Actions tab. The workflow file must be pushed to GitHub before the manual trigger is available.

```yaml
jobs:
  test:
```

`jobs` contains the jobs in the workflow. This workflow has one job, with the identifier `test`. A job identifier is used for organization; it does not have to match the display name.

```yaml
timeout-minutes: 60
runs-on: ubuntu-latest
env:
  CI: "true"
  HEADLESS: "true"
```

`timeout-minutes` limits how long the job can run. `runs-on` selects the runner operating system. GitHub supplies the Ubuntu virtual machine. Job-level `env` values are available to every step; these values tell Playwright to use CI settings and headless browsers.

```yaml
steps:
  - uses: actions/checkout@v7
```

The job starts with a list of `steps`. `uses` means “run a reusable GitHub Action.” `actions/checkout` downloads the repository into the runner so later commands can access files such as `package.json` and `tests/`.

```yaml
- uses: actions/setup-node@v7
  with:
    node-version: lts/*
    cache: npm
```

This reusable action installs and configures Node.js. `with` supplies inputs to the action. `lts/*` asks for a current Node.js LTS release. `cache: npm` caches npm's downloaded package data using the lock file as the key; it does not replace `npm ci`.

```yaml
- name: Install dependencies
  run: npm ci
```

`name` gives the step a readable label in the run log. `run` executes a shell command on the runner. `npm ci` installs the exact dependencies recorded in the lock file and is suited to clean CI environments. It requires a committed `package-lock.json`.

```yaml
- name: Install Playwright Browsers
  run: npx playwright install --with-deps
```

The project dependency installs Playwright's command-line interface. This command downloads the browser binaries and required Linux packages for the operating system runner.

```yaml
- name: Run Playwright tests
  run: npm test
```

The `test` script in `package.json` first removes previous report and test-result folders, then starts Playwright Test. Playwright reads `playwright.config.js`, discovers tests under `tests/`, applies the configured projects and reporters, and returns a success or failure exit code. A nonzero exit code marks the step and normally the job as failed.

```yaml
- uses: actions/upload-artifact@v7
  if: ${{ !cancelled() }}
  with:
    name: playwright-reports-and-results
    path: |
      reports/html-report/
      reports/allure-results/
      test-results/
    retention-days: 30
    if-no-files-found: warn
```

This uses the artifact-upload action to save a folder from the runner. The `if` expression allows the step to run unless the workflow was cancelled, including after a test failure. `name` is the download name shown in GitHub. `path` must match a folder that the test run actually generated. `retention-days` controls how long GitHub keeps the artifact.

### YAML Indentation

YAML uses indentation to show which values belong to each section. In the example, `branches` is nested under `push` and `pull_request`; the test job is nested under `jobs`; and each command is nested under `steps`. Use spaces, not tabs, and keep sibling entries at the same indentation level.

## 6. How a Run Proceeds

```text
Push to master / pull request to master
                |
                v
       GitHub matches the trigger
                |
                v
     GitHub starts an Ubuntu runner
                |
                v
       Checkout repository files
                |
                v
      Install Node.js and npm deps
                |
                v
       Install Playwright browsers
                |
                v
 Read config and run tests in projects
                |
                v
    Upload HTML, Allure, and test-result artifacts
```

Every run has logs. If a test fails, open the run and inspect the first failed step. Failures early in the job often indicate setup problems; failures in the Playwright step may indicate browser launch, application, test, or environment problems.

## 7. Run It Locally Before Pushing

Before relying on CI, run the same test command locally from the repository root:

```bash
npm ci
npx playwright install
npm test
```

The project also has scripts in `package.json`, for example:

```bash
npm run test:smoke
npm run test:chromium
npm run test:firefox
npm run test:webkit
```

The `npm test` script removes previous report and test-result folders, then starts Playwright. The workflow uses the same script. Set `HEADLESS=false` locally when you want to see the browser; the workflow sets `HEADLESS="true"`.

Local success does not guarantee CI success. Your computer and the GitHub Ubuntu runner can differ in operating system, installed browsers, environment variables, display availability, and available resources.

## 8. Use the GitHub Website to View a Run

1. Open the repository on GitHub.
2. Select the **Actions** tab.
3. Choose **Playwright Tests** in the workflow list.
4. Select a run to view its summary and status.
5. Select the `test` job.
6. Expand steps to read their logs. Start with the first step marked red.
7. If an artifact is available, download it near the bottom of the run summary.

Status symbols commonly mean:

| Status         | Meaning                                                                  |
| -------------- | ------------------------------------------------------------------------ |
| Green check    | The run succeeded.                                                       |
| Red cross      | A step or job failed. Open it and inspect the logs.                      |
| Yellow circle  | The run is queued or in progress.                                        |
| Grey / skipped | The workflow or step did not run, often because a condition was not met. |

To run automatically, push a new commit to a matching branch or open/update a pull request targeting a matching branch. This workflow also defines `workflow_dispatch`, so after it is pushed to GitHub, the Actions tab provides a manual **Run workflow** button.

## 9. Reports and Artifacts

Playwright reporters write files on the runner. Those files disappear when the temporary runner is removed unless the workflow uploads them.

In this framework, `playwright.config.js` configures the HTML report at:

```text
reports/html-report/
```

The workflow uploads these generated folders:

```text
reports/html-report/
reports/allure-results/
test-results/
```

These paths match the configured HTML reporter, Allure reporter, and Playwright failure attachments. The previous run's `No files were found with the provided path: playwright-report/` warning came from the old path. Push the updated workflow and verify the next run has an artifact. The Allure folder contains raw results, not a generated Allure HTML report.

An artifact is downloadable output from a run. It is not the same as a cache: artifacts preserve outputs for people to inspect, while caches speed up later jobs by reusing eligible dependencies or files.

## 10. Project-Specific CI Checks to Know

These details matter when interpreting this repository's current run:

### Headless Browser Mode

The GitHub runner is a Linux server without a desktop display, so CI should use headless browsers. The Playwright config reads `env.headless`, which defaults to headless mode and supports `HEADLESS=false` for a visible local browser. The workflow explicitly sets `HEADLESS: "true"` at the job level:

```yaml
jobs:
  test:
    env:
      HEADLESS: "true"
```

This corrects the previous hard-coded `headless: false` setting. If a future run still fails, read the expanded **Run Playwright tests** log to identify the actual test or browser error.

### Workflow Matrix Versus Playwright Projects

There is one GitHub Actions job, not three separate matrix jobs. Playwright itself has three projects (`chromium`, `firefox`, and `webkit`) in `playwright.config.js`, so the one Playwright command runs the tests against those configured projects. To get separate parallel GitHub jobs per browser, the workflow would need an Actions `strategy.matrix` and a command that selects the corresponding Playwright project.

### Trigger Branches

The workflow names both `main` and `master`. Pushes to either branch can trigger it. Pull requests trigger it when their target/base branch is either `main` or `master`.

### Workflow File Location

GitHub discovers workflow definitions in `.github/workflows/`. A YAML file elsewhere in the repository is not automatically treated as a GitHub Actions workflow.

### Interpreting the Previous Failed Run Shown in GitHub

The screenshot showed the workflow triggered and the `test` job ran. Its annotations distinguished the failure from the warnings:

- **Error: `Process completed with exit code 1.`** The Playwright command failed, so the job is red. This summary does not show which test or browser error caused it. Click the `test` job, expand **Run Playwright tests**, and read the Playwright output. The headed-browser setting is a plausible cause, but the detailed log is needed to confirm.
- **Warning: no files found at `playwright-report/`.** The old artifact path did not match the configured HTML report directory, `reports/html-report/`. The updated workflow now uploads the configured report and result folders. This warning was not the reason the Playwright step returned exit code 1.
- **Warning: actions target Node.js 20 and are being forced to run on Node.js 24.** This was an action-runtime warning for the old action versions, not the Playwright test failure. The updated workflow uses action versions that declare the Node.js 24 runtime.
- **Notice: `ubuntu-latest` is scheduled to move to Ubuntu 26.** This is a runner-image notice, not a failure. Review the notice in GitHub when planning runner compatibility.

The reliable diagnosis comes from the first failing step's expanded logs, not from the red status alone. The workflow and headless-mode changes do not prove the test suite now passes; confirm by inspecting a fresh run after pushing the changes.

## 11. Adding a Manual Trigger

This workflow includes `workflow_dispatch`, which enables manual starts from the Actions tab. To add the same trigger to another workflow, include it under `on`:

```yaml
on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]
  workflow_dispatch:
```

After this change is pushed to GitHub, open **Actions → Playwright Tests**. GitHub can show a **Run workflow** button for eligible branches. A manual trigger starts the workflow; it does not replace the push and pull-request triggers.

## 12. Adding a Browser Matrix (Concept)

A matrix repeats a job using different values. For example, an Actions job could define:

```yaml
strategy:
  matrix:
    browser: [chromium, firefox, webkit]
```

Then the test command can select the current value:

```yaml
run: npx playwright test --project=${{ matrix.browser }}
```

This produces separate jobs/runs for the browsers, which can run in parallel. It can make failures easier to identify, but uses more runner time. Do not combine a full Playwright three-project run with a three-browser matrix unless you intend to run each browser multiple times.

## 13. Secrets and Environment Variables

An environment variable supplies configuration to a process. A secret is an encrypted GitHub value intended for sensitive data. Never commit passwords, API keys, or access tokens directly into a workflow file, source code, or ordinary JSON configuration.

To add a repository secret, use **Settings → Secrets and variables → Actions → New repository secret**. Workflows refer to it with the `secrets` context, for example:

```yaml
env:
  PASSWORD: ${{ secrets.TEST_PASSWORD }}
```

This framework reads values such as `BASE_URL`, `PASSWORD`, and `HEADLESS` from environment variables. Only secrets that are actually required should be added to GitHub. The SauceDemo sample credentials in this project are public demo credentials, not a pattern for storing real account passwords.

Forked pull requests generally do not receive repository secrets, to protect the repository. Design workflows so untrusted contributions cannot access privileged secrets.

## 14. Common Problems and How to Investigate Them

| Symptom                             | What to check                                                                                                                                                                                            |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No run appears                      | Confirm the workflow exists under `.github/workflows/`, is on the pushed branch, and the event/branch matches the `on` rules. Check that Actions are enabled in repository settings.                     |
| `npm ci` fails                      | Confirm `package-lock.json` is committed and consistent with `package.json`; inspect Node.js version and npm error.                                                                                      |
| Browser cannot launch               | Confirm browser installation completed; check headed/headless settings and Linux dependencies. On a normal GitHub Ubuntu runner, use headless mode and ensure the config does not hard-code headed mode. |
| Tests fail only in CI               | Inspect the first failing test and attachments; compare environment variables, base URL, timing, browser mode, and parallel worker settings.                                                             |
| Artifact says no files found        | Compare the upload `path` with reporter output. This workflow uploads `reports/html-report/`, `reports/allure-results/`, and `test-results/`; check that these folders were generated.                   |
| Workflow did not start for a branch | Check whether the branch is exactly `main` or `master`; inspect the workflow's push and pull-request branch filters.                                                                                     |
| Run is red but some tests passed    | The job fails if Playwright returns a failure exit code. Open the test step and review failed tests, retries, traces, screenshots, and videos.                                                           |

Use this investigation order: **workflow run summary → failed job → first failed step → error log → test attachments/artifacts → local reproduction**.

## 15. Suggested Teaching Session

1. Explain the problem CI solves: automatically checking a change after it reaches the shared repository.
2. Open `.github/workflows/playwright.yml` and locate `name`, `on`, `jobs`, `runs-on`, `steps`, `uses`, and `run`.
3. Trace a push from the GitHub event to the Ubuntu runner and then to `npm test`.
4. Compare the workflow with `package.json` and `playwright.config.js` to show how GitHub invokes Playwright and Playwright chooses tests, browsers, and reports.
5. Open **Actions** on GitHub and inspect an actual run, including one failed step and its logs.
6. Ask students to match artifact paths to reporter output and explain why CI should use headless browsers.
7. As an exercise, use the workflow's existing `workflow_dispatch` trigger to start a manual run.
8. As a second exercise, design a browser matrix and explain how it differs from Playwright projects.

## 16. Student Exercises

- Change a test title or add a small assertion, push to a feature branch, and open a pull request targeting `master`. Observe when the workflow starts.
- Deliberately use a nonexistent artifact folder in a practice branch. Read the artifact step's log and correct the path.
- Use `workflow_dispatch` and the Actions tab to start a manual run.
- Configure a browser matrix in a practice workflow. Confirm that each job selects only its assigned Playwright project.
- Find the generated HTML report locally and explain what must be uploaded for it to remain downloadable after the runner ends.

## 17. Short Explanation for Students

> GitHub Actions is GitHub's automation service. A workflow is a YAML file stored under `.github/workflows`. Events such as pushes and pull requests trigger jobs. Jobs run on hosted or self-hosted runners, and each job contains steps that run reusable actions or shell commands. In this framework, the workflow uses an Ubuntu runner to install Node.js, install project dependencies and Playwright browsers, run the Playwright suite, and upload a report artifact. I can inspect the run and its logs from the repository's Actions tab.

## Key Takeaways

- GitHub Actions runs automated workflows in response to configured events.
- A workflow is YAML, a job runs on a runner, and a job contains steps.
- `uses` invokes a reusable action; `run` executes a shell command.
- This project's workflow triggers on pushes and pull requests for `main` and `master`.
- Playwright's config defines the browser projects; the current workflow has no Actions matrix.
- Reports must be uploaded as artifacts if they need to be available after the runner is removed.
- Always inspect the actual config and run logs; documentation can describe an intended setup that differs from the files currently in the repository.
