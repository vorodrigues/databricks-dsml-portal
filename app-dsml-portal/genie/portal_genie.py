# Databricks notebook source
# MAGIC %md
# MAGIC # Genie Agent over the DSML Portal projects
# MAGIC
# MAGIC Task `genie` of the `dsml_portal_genie` job. Both steps are idempotent:
# MAGIC
# MAGIC 1. Registers the Lakebase database of the portal catalog in Unity Catalog as a **read-only catalog**
# MAGIC    with the same name, which exposes `<database>.portal.projects` to Serverless compute.
# MAGIC 2. Creates or updates the **Genie Space** `DSML Portal Projects` (found by title) on a Serverless SQL warehouse,
# MAGIC    with the portal projects, the prod tables of the project, and the MLflow and Jobs system tables.

# COMMAND ----------

# DBTITLE 1,Job parameters
dbutils.widgets.text("catalog", "")            # prod catalog of the projects
dbutils.widgets.text("schema", "")             # prod schema of the projects
dbutils.widgets.text("warehouse_id", "")       # Serverless SQL warehouse of the Space
dbutils.widgets.text("lakebase_branch", "")    # projects/<project>/branches/<branch> hosting the portal database
dbutils.widgets.text("lakebase_database", "")  # Postgres database of the portal catalog (also the UC catalog name)
dbutils.widgets.text("readers", "")            # comma-separated users/groups that read the prod tables in the Space

CATALOG = dbutils.widgets.get("catalog")
SCHEMA = dbutils.widgets.get("schema")
WAREHOUSE_ID = dbutils.widgets.get("warehouse_id")
BRANCH = dbutils.widgets.get("lakebase_branch")
DATABASE = dbutils.widgets.get("lakebase_database")
READERS = [r.strip() for r in dbutils.widgets.get("readers").split(",") if r.strip()]
TITLE = "DSML Portal Projects"

# COMMAND ----------

# MAGIC %md
# MAGIC ## 1. Register the Lakebase database in Unity Catalog
# MAGIC The Postgres API (`/api/2.0/postgres/catalogs`) registers a database of a Lakebase **autoscaling** project
# MAGIC as a catalog. It returns a long-running operation, polled until `done`. The catalog is read-only: the portal
# MAGIC keeps writing to Lakebase, and Unity Catalog governs the reads.

# COMMAND ----------

import time
from databricks.sdk import WorkspaceClient
from databricks.sdk.errors import NotFound

w = WorkspaceClient()

try:
    w.api_client.do("GET", f"/api/2.0/postgres/catalogs/{DATABASE}")
    print(f"catalog '{DATABASE}' already registered")
except NotFound:
    op = w.api_client.do("POST", "/api/2.0/postgres/catalogs", query={"catalog_id": DATABASE},
                         body={"spec": {"postgres_database": DATABASE, "branch": BRANCH}})
    while not op.get("done"):
        time.sleep(5)
        op = w.api_client.do("GET", f"/api/2.0/postgres/{op['name']}")
    if "error" in op:
        raise RuntimeError(op["error"])
    print(f"catalog '{DATABASE}' registered from {BRANCH}")

display(spark.sql(f"SELECT name, status, creator, prod_model FROM {DATABASE}.portal.projects"))

# COMMAND ----------

# MAGIC %md
# MAGIC ## 2. Read access to the prod tables
# MAGIC Genie runs the SQL with the identity of the user who asks. The `readers` get `USE CATALOG` on the prod catalog
# MAGIC and `USE SCHEMA` + `SELECT` on the prod schema (`GRANT` is idempotent). Access to the system tables and to the
# MAGIC `dsml_portal` catalog is granted separately.

# COMMAND ----------

for reader in READERS:
    spark.sql(f"GRANT USE CATALOG ON CATALOG {CATALOG} TO `{reader}`")
    spark.sql(f"GRANT USE SCHEMA, SELECT ON SCHEMA {CATALOG}.{SCHEMA} TO `{reader}`")
    print(f"read access on {CATALOG}.{SCHEMA} granted to {reader}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 3. Space content
# MAGIC - **Tables**: the portal projects, the prod tables of the fraud template, and the system tables of MLflow
# MAGIC   runs and Jobs (sorted by identifier, as the API requires).
# MAGIC - **Instructions**: what a project is, how it links to its experiment runs, model, jobs and tables, and the PIX fraud domain.
# MAGIC - **Sample questions**: shown to users when they open the Space.
# MAGIC
# MAGIC Item IDs are derived from their text, so reruns keep the same IDs.

# COMMAND ----------

import hashlib
import json

def item_id(text):
    return hashlib.md5(text.encode()).hexdigest()  # 32 hex chars

PROD = f"{CATALOG}.{SCHEMA}"
WORKSPACE_ID = str(w.get_workspace_id())

TABLES = {
    f"{DATABASE}.portal.projects": "One row per DSML Portal project: status, creator, bundle parameters and production model",
    f"{PROD}.raw_pix_transactions": "PIX transactions (silver): holder, instant in Brasilia time and amount in BRL",
    f"{PROD}.raw_fraud_labels": "Fraud labels of PIX transactions (label 1 = fraud)",
    f"{PROD}.fraud_batch_predictions": "Batch scoring output; each run appends rows with the same scored_at (prediction 1 = fraud)",
    f"{PROD}.fraud_serving_inference_payload": "Inference table of the prod serving endpoint: one row per request",
    "system.mlflow.runs_latest": "Latest state of each MLflow run, with params, tags and aggregated metrics",
    "system.lakeflow.jobs": "Job definitions (SCD2: one row per change)",
    "system.lakeflow.job_run_timeline": "Job runs (start, end and result state)",
}

INSTRUCTIONS = f"""\
DSML Portal projects
- {DATABASE}.portal.projects has one row per ML project created in the DSML Portal (a Databricks App). Each project is a GitHub repository (repo = owner/name) with a Databricks bundle rendered from a project template; creator is the user who created it.
- status: 'creating' (repository and template being set up), 'ready' (created successfully) or 'failed' (creation error, see error).
- params is the JSON of the bundle parameters. Use it only for catalog, schema_dev, schema_staging, schema_prod and model_name (for example get_json_object(params, '$.schema_prod')). Never use the root_path_* keys: they may not match the deployed folders.
- prod_model is the production registered model (<catalog>.<schema_prod>.<model_name>); the version with the champion alias is the one in production.

Project assets
- Each project deploys its bundle per target (dev, staging, prod) to a workspace folder ending in /<project name>/<target>/.
- Jobs of a project: system.lakeflow.jobs rows whose deployment.metadata_file_path contains '/<project name>/<target>/'. Prod jobs are prod_fraud_setup, prod_fraud_training, prod_fraud_batch_scoring and prod_fraud_online_deploy. Keep the latest row per job_id (max change_time) with delete_time null.
- Job runs: system.lakeflow.job_run_timeline joined on workspace_id and job_id. Long runs span several rows: keep the row with the latest period_end_time per run_id. The latest run of a job has the max period_start_time; result_state null means the run is still in progress.
- Training runs of a project: system.mlflow.runs_latest rows whose tags['mlflow.databricks.notebookPath'] contains '/<project name>/<target>/'. The final run of each training has run_name 'final_model' and logs the test metric test_auc; read it from aggregated_metrics (metric_name 'test_auc', latest_value). The tuning runs log train_auc and val_auc.
- Always filter system tables by workspace_id = '{WORKSPACE_ID}'.
- Prod tables of the projects are in {PROD}. The latest batch scoring is the set of rows of fraud_batch_predictions with the max scored_at. fraud_serving_inference_payload has one row per request to the prod endpoint prod_fraud_serving; count requests per day with request_date.

PIX fraud domain
- PIX is the Brazilian instant payment system. Each transaction has holder_id (account holder), created_at_brt (Brasilia time) and amount (BRL); about 5% of the labeled transactions are fraud.
- The model scores whether a transaction is fraud from batch and on-demand features of the holder; prediction 1 means fraud.
"""

QUESTIONS = [
    "Which projects are ready, and who created them?",
    "What is the test metric of the latest training run of each project?",
    "What is the status of the latest run of each prod job of each project?",
    "How many transactions did the latest batch scoring classify as fraud?",
    "What is the daily request volume of the serving endpoint?",
]

space = {
    "version": 2,
    "config": {"sample_questions": sorted(
        [{"id": item_id(q), "question": [q]} for q in QUESTIONS], key=lambda q: q["id"])},
    "data_sources": {"tables": [
        {"identifier": t, "description": [d]} for t, d in sorted(TABLES.items())]},
    "instructions": {"text_instructions": [
        {"id": item_id(TITLE), "content": [INSTRUCTIONS]}]},
}

# COMMAND ----------

# MAGIC %md
# MAGIC ## 4. Create or update the Space
# MAGIC The Space is found by title among the Spaces visible to the job identity: `PATCH` updates it in place
# MAGIC (same ID and URL), otherwise `POST` creates it.

# COMMAND ----------

def find_space(title):
    page_token = None
    while True:
        resp = w.api_client.do("GET", "/api/2.0/genie/spaces",
                               query={"page_size": 100, **({"page_token": page_token} if page_token else {})})
        for s in resp.get("spaces", []):
            if s.get("title") == title:
                return s["space_id"]
        page_token = resp.get("next_page_token")
        if not page_token:
            return None

body = {
    "title": TITLE,
    "description": "Ask about the DSML Portal projects and their assets: experiment runs, jobs, models and prod tables.",
    "warehouse_id": WAREHOUSE_ID,
    "serialized_space": json.dumps(space),
}

space_id = find_space(TITLE)
if space_id:
    w.api_client.do("PATCH", f"/api/2.0/genie/spaces/{space_id}", body=body)
    print(f"updated Space {space_id}")
else:
    space_id = w.api_client.do("POST", "/api/2.0/genie/spaces", body=body)["space_id"]
    print(f"created Space {space_id}")

print(f"{w.config.host}/genie/rooms/{space_id}")
