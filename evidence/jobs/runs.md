# Job runs

Runs of the prod jobs of the project `databricks-tech-bar-fraud-project` (bundle target `prod`, run as the service principal `cicd-ml-serving`, application ID `6036593a-f1b6-49ee-aa6d-145161164de9`) and of the portal job `dsml_portal_genie` (run as the user). Raw data: [`runs.json`](runs.json) (`databricks jobs get-run <run_id>`).

| Job | Job ID | Run ID | Result | Start (UTC) | Duration |
|---|---|---|---|---|---|
| `prod_fraud_setup` | `669416297708009` | `622643183755757` | SUCCESS | 2026-10-30T03:20:32Z | 127 s |
| `prod_fraud_training` | `343968601521557` | `874169827000330` | SUCCESS | 2026-10-30T03:23:06Z | 365 s |
| `prod_fraud_batch_scoring` | `1054413573032453` | `353407243695613` | SUCCESS | 2026-10-30T03:29:36Z | 110 s |
| `prod_fraud_online_deploy` | `742346376031832` | `755720320337683` | SUCCESS | 2026-10-30T03:31:49Z | 598 s |
| `[dev victor_rodrigues] dsml_portal_genie` | `360018471114568` | `936327720412149` | SUCCESS | 2026-10-30T03:58:02Z | 36 s |

## Tasks

| Job | Task | Task run ID | Type | Result | Execution | Notebook with outputs |
|---|---|---|---|---|---|---|
| `prod_fraud_setup` | `data` | `164200081832598` | notebook | SUCCESS | 50 s | [`prod_fraud_setup/data.ipynb`](prod_fraud_setup/data.ipynb) |
| `prod_fraud_setup` | `online_store` | `614895700436738` | notebook | SUCCESS | 26 s | [`prod_fraud_setup/online_store.ipynb`](prod_fraud_setup/online_store.ipynb) |
| `prod_fraud_setup` | `tag_policy` | `506089748874747` | notebook | SUCCESS | 25 s | [`prod_fraud_setup/tag_policy.ipynb`](prod_fraud_setup/tag_policy.ipynb) |
| `prod_fraud_setup` | `ingest` | `632923422972773` | pipeline `84f23740-51d0-4c92-a41f-ef1713e45309` | SUCCESS | 72 s | [`../pipeline/`](../pipeline/) |
| `prod_fraud_training` | `feature_batch` | `335787102080941` | notebook | SUCCESS | 265 s | [`prod_fraud_training/feature_batch.ipynb`](prod_fraud_training/feature_batch.ipynb) |
| `prod_fraud_training` | `feature_ondemand` | `362209867413057` | notebook | SUCCESS | 34 s | [`prod_fraud_training/feature_ondemand.ipynb`](prod_fraud_training/feature_ondemand.ipynb) |
| `prod_fraud_training` | `train` | `182102771012835` | notebook | SUCCESS | 64 s | [`prod_fraud_training/train.ipynb`](prod_fraud_training/train.ipynb) |
| `prod_fraud_training` | `quality_gate` | `308458996904474` | condition `{{tasks.train.values.test_auc}} GREATER_THAN_OR_EQUAL {{job.parameters.min_auc}}` → `true` | SUCCESS | 1 s | - |
| `prod_fraud_training` | `register` | `577359816465499` | notebook | SUCCESS | 24 s | [`prod_fraud_training/register.ipynb`](prod_fraud_training/register.ipynb) |
| `prod_fraud_batch_scoring` | `score` | `847380244453163` | notebook | SUCCESS | 106 s | [`prod_fraud_batch_scoring/score.ipynb`](prod_fraud_batch_scoring/score.ipynb) |
| `prod_fraud_online_deploy` | `deploy` | `998477725909841` | notebook | SUCCESS | 594 s | [`prod_fraud_online_deploy/deploy.ipynb`](prod_fraud_online_deploy/deploy.ipynb) |
| `[dev victor_rodrigues] dsml_portal_genie` | `genie` | `651643827004425` | notebook | SUCCESS | 32 s | [`dsml_portal_genie/genie.ipynb`](dsml_portal_genie/genie.ipynb) |

## How the notebooks were exported

`databricks jobs export-run <task_run_id> --views-to-export CODE` returns each task run as an HTML page with the notebook model embedded (base64 of the URL-encoded JSON in `__DATABRICKS_NOTEBOOK_MODEL`). Each model was decoded and written as `.ipynb` (nbformat 4): markdown cells as markdown, code cells with their text outputs (stdout/stderr streams, `text/plain` results, and tables as text). Widget-only payloads are dropped, ANSI codes and progress-bar carriage returns are cleaned, and outputs longer than 6,000 characters keep the start and the end with a `[truncated N chars]` marker. The first cell of each notebook records the job, run, task, result and duration.
