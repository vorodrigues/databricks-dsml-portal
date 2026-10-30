# Execution evidence

Text evidence of the end-to-end run in the `vr-workspace` workspace (2026-10-30, UTC): the DSML Portal deployed as a Databricks App, the project `databricks-tech-bar-fraud-project` created from it, promoted by CI/CD, and run in prod (catalog `vr_workspace`, schema `tech_bar`).

Every file is text: JSON from the Databricks CLI, REST APIs and SQL statements on the Serverless SQL warehouse `854312e54074c4f7`, logs, and job notebooks exported as `.ipynb` with their cell outputs. Each JSON file has a `source` field with the command or query that produced it. Secrets are masked (`***` in the GitHub Actions logs), client IPs are masked in the app log, and data-plane URLs are omitted.

## Index

Each file maps to one of the six stages.

| Stage | File | Content |
|---|---|---|
| Lakeflow | [`pipeline/prod_update.json`](pipeline/prod_update.json) | Pipeline `prod_fraud_ingest` (Serverless, triggered, `vr_workspace.tech_bar`) and its update `b65cf9a4-…` `COMPLETED`, started by the `ingest` task of `prod_fraud_setup` |
| Lakeflow | [`pipeline/prod_update_events.log`](pipeline/prod_update_events.log) | Event log of that update: flows of the bronze streaming tables and silver materialized views up to `COMPLETED` |
| Lakeflow | [`pipeline/table_counts.json`](pipeline/table_counts.json) | Row counts per table (1,000,000 transactions; 100,000 labels), 10,000 holders, fraud rate 5.007% |
| Lakeflow | [`pipeline/expectations.json`](pipeline/expectations.json) | Expectation metrics (`passed_records`/`failed_records` per expectation, 0 dropped) from the event log of the dev deployment of the same pipeline |
| Lakeflow | [`jobs/runs.md`](jobs/runs.md) | State and duration of each prod job run and of each task, with links to the notebooks |
| Lakeflow | [`jobs/runs.json`](jobs/runs.json) | Raw `jobs get-run` data of the same runs |
| Lakeflow | [`jobs/prod_fraud_setup/data.ipynb`](jobs/prod_fraud_setup/data.ipynb) | Synthetic data generator that writes the JSON files to the landing volume |
| Unity Catalog | [`unity-catalog/prod_tables.json`](unity-catalog/prod_tables.json) | Tables of the prod schema with their types (streaming tables, materialized views, feature tables, predictions, inference table) and table tags |
| Unity Catalog | [`unity-catalog/landing_volume.json`](unity-catalog/landing_volume.json) | Managed volume `vr_workspace.tech_bar.landing` and the files Auto Loader ingested from it |
| Unity Catalog | [`unity-catalog/model.json`](unity-catalog/model.json) | Registered model `vr_workspace.tech_bar.tech_bar_fraud_model`: version 1 with alias `champion`, tags `team`, `retention`, `confidentiality`, governed tag policies |
| Unity Catalog | [`jobs/prod_fraud_setup/tag_policy.ipynb`](jobs/prod_fraud_setup/tag_policy.ipynb) | Governed tag policies `team` and `confidentiality` and their `ASSIGN` permission |
| Lakebase | [`lakebase/portal_projects_query.json`](lakebase/portal_projects_query.json) | Lakebase catalog `dsml_portal` (`MANAGED_ONLINE_CATALOG`) and a query of `dsml_portal.portal.projects` |
| Lakebase | [`lakebase/online_store.json`](lakebase/online_store.json) | Lakebase project `feature-store-online`, its databases, the online store and the online feature table (10,000 holders) |
| Lakebase | [`jobs/prod_fraud_setup/online_store.ipynb`](jobs/prod_fraud_setup/online_store.ipynb) | Reuses the Lakebase online store (`AVAILABLE`) and ensures `CAN_USE` for the run identities |
| ML | [`jobs/prod_fraud_training/feature_batch.ipynb`](jobs/prod_fraud_training/feature_batch.ipynb) | Batch Feature Views over the silver transactions, with managed materialization offline (Delta) and online (Lakebase) |
| ML | [`jobs/prod_fraud_training/feature_ondemand.ipynb`](jobs/prod_fraud_training/feature_ondemand.ipynb) | On-demand features computed from the request payload |
| ML | [`jobs/prod_fraud_training/train.ipynb`](jobs/prod_fraud_training/train.ipynb) | Training set, HyperOpt tuning and final XGBoost model logged with the feature spec |
| ML | [`jobs/prod_fraud_training/register.ipynb`](jobs/prod_fraud_training/register.ipynb) | Registration in Unity Catalog with alias `champion` and tags, after the `quality_gate` |
| ML | [`ml/training_run.json`](ml/training_run.json) | MLflow run `final_model` of the champion version: `test_auc` 0.6961, parameters, tags |
| ML | [`jobs/prod_fraud_batch_scoring/score.ipynb`](jobs/prod_fraud_batch_scoring/score.ipynb) | Batch scoring with `champion` |
| ML | [`ml/batch_predictions.json`](ml/batch_predictions.json) | `fraud_batch_predictions`: 100,000 scored rows, 43,054 predicted as fraud, sample rows |
| ML | [`jobs/prod_fraud_online_deploy/deploy.ipynb`](jobs/prod_fraud_online_deploy/deploy.ipynb) | Route-optimized endpoint `prod_fraud_serving` with an AI Gateway inference table |
| ML | [`serving/endpoint.json`](serving/endpoint.json) | Endpoint state `READY`, served entity `tech_bar_fraud_model` v1 |
| ML | [`serving/query.md`](serving/query.md) | How the real request was sent |
| ML | [`serving/request.json`](serving/request.json) | Real request (two PIX transactions) |
| ML | [`serving/response.json`](serving/response.json) | Real response (`predictions`: predicted class per transaction, `1` = fraud) |
| ML | [`serving/inference_payload.json`](serving/inference_payload.json) | The same request and response in the inference table (status 200) |
| ML | [`cicd/workflow_runs.json`](cicd/workflow_runs.json) | GitHub Actions runs of the project: `CI - staging` and `CD - prod`, with jobs and steps |
| ML | [`cicd/ci_staging.log`](cicd/ci_staging.log) | CI log on the pull request: validate, deploy and training in staging (`staging_fraud_training` `SUCCESS`) |
| ML | [`cicd/ci_staging_attempt1.log`](cicd/ci_staging_attempt1.log) | First CI attempt, before the staging tables existed (truncated) |
| ML | [`cicd/cd_prod.log`](cicd/cd_prod.log) | CD log on the merge: validate and deploy of the prod target (12 resources created) |
| Genie Agent | [`genie/space.json`](genie/space.json) | Space `DSML Portal Projects`: tables, instructions and sample questions |
| Genie Agent | [`genie/answers.md`](genie/answers.md) | For each sample question: question, generated SQL and result |
| Genie Agent | [`genie/answers.json`](genie/answers.json) | Raw Conversation API output of the same answers |
| Genie Agent | [`jobs/dsml_portal_genie/genie.ipynb`](jobs/dsml_portal_genie/genie.ipynb) | Job `dsml_portal_genie`: registers the Lakebase catalog in Unity Catalog and creates the Space |
| Databricks App | [`databricks-app/app.json`](databricks-app/app.json) | App `dsml-portal` `RUNNING`, deployments `SUCCEEDED`, resources, user API scopes and the scopes of its OAuth integration |
| Databricks App | [`databricks-app/app.log`](databricks-app/app.log) | App log: deploy, start (`portal.projects ready`), project creation and API calls |
| Databricks App | [`databricks-app/projects_api.json`](databricks-app/projects_api.json) | Responses of the portal API: projects, project details, repository tree and production model run |
| Databricks App | [`project-repo/repository.md`](project-repo/repository.md) | Public repository created by the portal: URL, file tree, merged pull request |
| Databricks App | [`project-repo/pull_request_1.json`](project-repo/pull_request_1.json) | Pull request #1 `init` → `main`, merged |

## Notes

- The notebooks in `jobs/` were exported with `databricks jobs export-run <task_run_id> --views-to-export CODE`. The export is an HTML page with the notebook embedded; the embedded notebook was decoded and written as `.ipynb` with its text outputs (see [`jobs/runs.md`](jobs/runs.md#how-the-notebooks-were-exported)).
- The prod pipeline event log and the landing volume are owned by the service principal that runs the prod jobs. The expectation metrics come from the dev deployment of the same pipeline (same code and data generator); in prod, the bronze and silver counts match, so no row was dropped. The volume files are listed from the `source_file` column of the bronze tables.
- The prod jobs run as the service principal `cicd-ml-serving` (application ID `6036593a-f1b6-49ee-aa6d-145161164de9`).
