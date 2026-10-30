# DSML Portal

A Databricks App that creates and tracks ML projects. Each project is a GitHub repository with a Databricks bundle rendered from a **Project Template**. The project is registered in a catalog stored in Lakebase, and the portal follows it through MLflow and GitHub.

## Overview

| Component | How the portal uses it |
|---|---|
| Databricks Apps | Hosts the React frontend and the Node.js (Express) backend |
| Databricks Asset Bundles | `databricks.yml` + `resources/dsml_portal.app.yml` deploy the app and its resources |
| Bundle templates | `templates/classification` (`databricks_template_schema.json` + `template/`) is the `Classification` Project Template |
| User authorization (OBO) | Every workspace call (Unity Catalog, MLflow, SCIM) uses the signed-in user's token |
| MLflow REST API | Source run of the production model: details, metrics, parameters, tags and artifacts |
| Unity Catalog Model Registry | The production model is the version behind the `champion` alias of `<catalog>.<schema_prod>.<model_name>`; versions tagged `approval=pending` are approved (alias + tag) or rejected (tag) in the portal |
| GitHub REST API | Creates repositories, Actions secrets, the `init` branch, and handles pull requests and commit activity |
| Lakebase | Table `portal.projects` in the `dsml_portal` database (app resource) |
| Secret scopes | GitHub token and CI/CD service principal credentials (app resources) |
| Genie | Space `DSML Portal Projects` over the projects and their prod assets (job `dsml_portal_genie`) |

### Project lifecycle

1. **Create**: the form in `Create new project` sends the project name, repository settings and bundle parameters.
2. The app records the project as `creating`, then:
   - creates the GitHub repository, with `main` holding only a `README.md`;
   - sets the Actions secrets `DATABRICKS_HOST`, `DATABRICKS_CLIENT_ID` and `DATABRICKS_CLIENT_SECRET`;
   - renders the Project Template and pushes it to the `init` branch.
3. The project becomes `ready`, or `failed` with the error message. The data scientist opens the first pull request from `init` to `main` once the code is ready.
4. **Track**: open pull requests to `main` are shown as pending approvals, and `Approve` merges them while `Reject` closes them. The CI/CD of the project deploys the bundle, and the portal then shows the production model run from MLflow.
5. **Approve models**: versions of the production model tagged `approval=pending` are also pending approvals. `Approve` sets the `champion` alias on the version (moving it from the previous version) and the tag `approval=approved`; `Reject` sets `approval=rejected`. Only versions still `pending` are accepted.
6. **Delete**: the menu of the `Details` header removes the project from the portal catalog (not while it is `creating`):
   - only the row of `portal.projects` is deleted; the GitHub repository and the workspace assets (MLflow experiments, registered models, jobs and schemas) are kept and must be removed manually if needed;
   - the activity heatmap of the `Home` no longer counts the commits of that repository, which remain on GitHub;
   - a new project with the same name fails while the repository exists.

### Pages

| Page | Route | Content |
|---|---|---|
| Home | `/` | Pending-approval alerts (pull requests and model versions), indicators, `Recent projects` and a commit-activity heatmap (52 weeks) |
| Projects | `/projects` | Paginated table with name and creator filters |
| Create new project | `/projects/new` | Project form with a `Summary` panel |
| Details | `/projects/<name>` | Creation status, pending approvals, the `Overview` and `Model Artifacts` tabs, and the header menu with `Delete` |

### Layout

```
app-dsml-portal/
├── databricks.yml                 # bundle `dsml_portal`, target `dev`
├── resources/
│   ├── dsml_portal.app.yml        # app `dsml-portal`: secrets, database, user API scopes
│   └── dsml_portal_genie.job.yml  # job `dsml_portal_genie` (Serverless)
├── genie/portal_genie.py          # registers the catalog database in UC and builds the Genie Space
├── app/                           # app source (client: React + Vite, server: Express)
│   ├── app.yaml                   # runtime command and env from resources
│   └── build.mjs                  # builds ./app/build, the deployed folder
├── templates/classification/      # Project Template (bundle template format)
└── scripts/
    ├── create_database.sh         # creates the `dsml_portal` database (before the first deploy)
    └── grant_user_scopes.sh       # adds the extra user scopes to the app OAuth integration
```

## Prerequisites

- Databricks CLI with a profile for the workspace (default `vr-workspace`) and an account-level profile (default `admin-account`) for an account admin.
- Node.js 20+ and npm. Install dependencies with `npm install` in `app/`.
- `psql` for `scripts/create_database.sh` and `jq` for the scope check below.
- Secret scope `dsml-portal` with the secret `github-token`. It holds the GitHub token that is used for every GitHub call, and the token needs permission to create repositories, write contents and workflows, manage pull requests and set Actions secrets. For example, from a signed-in `gh` CLI:
  ```bash
  databricks -p vr-workspace secrets create-scope dsml-portal
  gh auth token | databricks -p vr-workspace secrets put-secret dsml-portal github-token
  ```
- Secret scope `mlops` with `sp-client-id` and `sp-client-secret` of the CI/CD service principal (`cicd-ml-serving`). These values become the Actions secrets of each new repository.
- Lakebase project `feature-store-online` (Postgres API). `scripts/create_database.sh` connects to the read-write endpoint of its default branch. The bundle variables `lakebase_branch` and `lakebase_database` hold the resource names of the branch and of the database (`databricks postgres list-databases <branch>`).

## Deploy

All commands run from `app-dsml-portal/`.

1. Create the catalog database once. The step is idempotent, and the database must exist before the first deploy:
   ```bash
   bash scripts/create_database.sh            # [profile] [instance (Lakebase project ID)] [database]
   ```
2. Build, deploy and start the app. `bundle deploy` uploads `app/build` and updates the app resources. `bundle run` deploys that code and starts it:
   ```bash
   (cd app && npm run build)
   databricks -p vr-workspace bundle deploy
   databricks -p vr-workspace bundle run dsml_portal
   ```
3. Grant the extra user scopes. An account admin runs this step after the deploy. The `mlflow`, `unity-catalog`, `scim` and `all-apis` scopes cannot be declared in `user_api_scopes`, so the script adds them to the app OAuth integration:
   ```bash
   bash scripts/grant_user_scopes.sh          # [workspace_profile] [account_profile] [app_name]
   ```
   Run the script again whenever the app is recreated or its `user_api_scopes` change. To check the scopes:
   ```bash
   CLIENT_ID=$(databricks -p vr-workspace apps get dsml-portal -o json | jq -r .oauth2_app_client_id)
   databricks -p admin-account account custom-app-integration get "$CLIENT_ID" -o json | jq .scopes
   ```
4. Open the app URL (`databricks -p vr-workspace apps get dsml-portal`). On the first access, each user consents to the requested scopes. After the scopes change, users must sign in again.

On startup, the app creates the schema `portal` and the table `portal.projects` if they do not exist. The app logs are available with `databricks -p vr-workspace apps logs dsml-portal`.

### Genie Space

The job `dsml_portal_genie` (deployed with the bundle) runs `genie/portal_genie.py` on Serverless compute. All steps are idempotent:

1. Registers the `dsml_portal` database in Unity Catalog as the read-only catalog `dsml_portal`, so `dsml_portal.portal.projects` can be queried from Serverless compute (SQL warehouses and notebooks).
2. Grants the `readers` `USE CATALOG` on the prod catalog and `USE SCHEMA` + `SELECT` on the prod schema, since Genie runs the SQL with the identity of the user who asks.
3. Creates or updates the Genie Space `DSML Portal Projects`, found by title, with:
   - **Tables**: `dsml_portal.portal.projects`; `raw_pix_transactions`, `raw_fraud_labels`, `fraud_batch_predictions` and `fraud_serving_inference_payload` from the prod schema; `system.mlflow.runs_latest`, `system.lakeflow.jobs` and `system.lakeflow.job_run_timeline`.
   - **Instructions**: project statuses, how a project links to its training runs, model, jobs and tables (through `params`, `prod_model` and the deployed bundle folder `/<project>/<target>/`), and the PIX fraud domain.
   - **Sample questions**: ready projects and their creators, test metric of the latest training run, status of the latest prod job runs, frauds in the latest batch scoring, daily serving requests.

| Job parameter | Default |
|---|---|
| `catalog` / `schema` | `vr_workspace` / `tech_bar` (prod catalog and schema of the projects) |
| `warehouse_id` | Serverless SQL warehouse of the Space |
| `lakebase_branch` | bundle variable `lakebase_branch` |
| `lakebase_database` | `dsml_portal` (Postgres database and UC catalog name) |
| `readers` | user who deploys the bundle (comma-separated users or account groups) |

Run it after the prod tables of a project exist, and again whenever the content changes:

```bash
databricks -p vr-workspace bundle run dsml_portal_genie
```

The job identity needs `CREATE CATALOG` on the metastore and `CAN_USE` on the warehouse. Space users need `CAN_USE` on the warehouse, `SELECT` on `dsml_portal.portal.projects` and access to the system tables. The Space URL is printed by the job.

### Local development

```bash
cd app
npm run dev          # Vite on :8766, proxies /api to :8787
npm run start:dev    # Express backend on :8787
npm run typecheck
```

Workspace calls need the `x-forwarded-access-token` header, which the Apps proxy sets in the deployed app. The catalog needs the `PG*` variables of the database resource.

## Usage

1. **Home**: click `Create` to open `Create new project`.
2. **Create new project**:
   - **Project name**: lowercase letters, digits and `-`, 3 to 50 characters, starting with a letter. The name must be unused in the catalog and on GitHub.
   - **Repository**: owner (from the GitHub token), name, description and visibility (`Private` by default).
   - **Project template**: `Classification`.
   - **Bundle**: template parameters, pre-filled with defaults. The dev `run_as` is always the signed-in user. The catalog, the schemas of the selected catalog, the online store, the service principal and the viewers group are read from the workspace with your permissions.
3. Click `Create`. The `Details` page shows the creation progress and refreshes until the project is `ready` or `failed`.
4. Develop on the `init` branch, then open a pull request to `main`. The pull request appears as a pending approval on `Home`, `Projects` and `Details`. In `Details`, `Approve` merges it and `Reject` closes it.
5. When a version of the production model is tagged `approval=pending`, it appears as a pending model approval on `Home`, `Projects` and `Details` (one alert per version). In `Details`, `Approve` moves the `champion` alias to the version and tags it `approval=approved`, and `Reject` tags it `approval=rejected`. The `Pending approvals` count adds open pull requests and pending model versions (its tooltip shows both). Model versions are read with your permissions and refreshed every minute at most.
6. With two or more alerts, `Home` and `Details` group them in a summary line (`X alerts: <name>, <name>, <name> +N more`) that expands to one line per alert; it starts collapsed on `Home` and expanded on `Details`.
7. After the project CI/CD trains and promotes a model (`champion` alias on the production model), `Details` shows:
   - **Overview**: project details (with the MLflow experiment, the registered model, the source and the tags of the run), metrics, parameters and the file tree of `main` (`Repository`);
   - **Model Artifacts**: the run artifact tree with a preview of text, JSON, YAML and image files.

The portal only lists projects whose repository the GitHub token can reach. MLflow and Unity Catalog data appear only when the signed-in user has access to them.

### Project Template parameters

| Parameter | Default |
|---|---|
| `bundle_name` | project name with `_` |
| `workspace_host` | workspace of the app |
| `catalog` | `vr_workspace` |
| `schema_dev` / `schema_staging` / `schema_prod` | `tech_bar_dev` / `tech_bar_staging` / `tech_bar` |
| `online_store` | `feature-store-online` |
| `experiment_name` | `fraud_experiment` (MLflow experiment, created at `<root_path>/<experiment_name>` in each target) |
| `model_name` | `fraud_model` (registered model `<catalog>.<schema>.<model_name>` in each target) |
| `root_path_dev` | `/Workspace/Users/<dev_user>/<project>/dev` |
| `root_path_staging` / `root_path_prod` | `/Workspace/<project>/staging` / `/Workspace/<project>/prod` |
| `service_principal` | `6036593a-f1b6-49ee-aa6d-145161164de9` (`cicd-ml-serving`) |
| `viewers_group` | `ml-viewers` |
| `dev_user` | signed-in user (set by the portal, not shown in the form) |

To render the template outside the app:

```bash
databricks -p vr-workspace bundle init templates/classification --config-file params.json --output-dir /tmp/my-project
```
