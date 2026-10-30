# Genie answers

Space `DSML Portal Projects` (`01f1d4155e9c14d0a6ea4024f1a6e241`), asked through the Genie Conversation API, one conversation per sample question. Raw output: [`answers.json`](answers.json). Space definition: [`space.json`](space.json).

## 1. Which projects are ready, and who created them?

- Status: `COMPLETED`, conversation `01f1d417f313108f8b621cdc322f539b`

Generated SQL:

```sql
SELECT `name`, `creator`
FROM `dsml_portal`.`portal`.`projects`
WHERE `status` ILIKE '%ready%'
  AND `name` IS NOT NULL
  AND `creator` IS NOT NULL
ORDER BY `name` ASC
```

Result:

| name | creator |
|---|---|
| databricks-tech-bar-fraud-project | victor.rodrigues@databricks.com |

Genie answer: There is **1** ready project in the visible data: **databricks-tech-bar-fraud-project**, created by **victor.rodrigues@databricks.com**.

## 2. What is the test metric of the latest training run of each project?

- Status: `COMPLETED`, conversation `01f1d417f3131132b41cdeccf358af95`

Generated SQL:

```sql
WITH project_runs AS (
  SELECT
    projects.`name` AS project_name,
    runs_latest.`run_id` AS run_id,
    runs_latest.`start_time` AS start_time,
    metric.`latest_value` AS test_auc,
    ROW_NUMBER() OVER (
      PARTITION BY projects.`name`
      ORDER BY runs_latest.`start_time` DESC, runs_latest.`update_time` DESC, runs_latest.`run_id` DESC
    ) AS rn
  FROM `dsml_portal`.`portal`.`projects` AS projects
  INNER JOIN `system`.`mlflow`.`runs_latest` AS runs_latest
    ON runs_latest.`workspace_id` = '7474655075961307'
   AND projects.`name` IS NOT NULL
   AND runs_latest.`run_name` = 'final_model'
   AND runs_latest.`start_time` IS NOT NULL
   AND runs_latest.`tags`['mlflow.databricks.notebookPath'] IS NOT NULL
   AND runs_latest.`tags`['mlflow.databricks.notebookPath'] ILIKE CONCAT('%/', projects.`name`, '/%')
  LATERAL VIEW EXPLODE(runs_latest.`aggregated_metrics`) exploded_metrics AS metric
  WHERE metric.`metric_name` = 'test_auc'
)
SELECT
  project_runs.project_name,
  project_runs.run_id,
  project_runs.start_time,
  project_runs.test_auc
FROM project_runs
WHERE project_runs.rn = 1
ORDER BY project_runs.project_name
```

Result:

| project_name | run_id | start_time | test_auc |
|---|---|---|---|
| databricks-tech-bar-fraud-project | 33532c22d9b442d4b0c1dbf74bb2eccc | 2026-10-30T03:28:25.976Z | 0.6960996351835935 |

Genie answer: For project **databricks-tech-bar-fraud-project**, the latest training run is run ID **33532c22d9b442d4b0c1dbf74bb2eccc** with start time **2026-10-30T03:28:25.976Z**, and the test metric **test_auc** is **0.6960996351835935**. Based on the visible data, the result includes **1 project**, so the latest recorded test metric shown is **0.6960996351835935** for **databricks-tech-bar-fraud-project**.

## 3. What is the status of the latest run of each prod job of each project?

- Status: `COMPLETED`, conversation `01f1d417f3131163b17661c5deb47f7e`

Generated SQL:

```sql
WITH `projects` AS (
  SELECT `name`
  FROM `dsml_portal`.`portal`.`projects`
  WHERE `name` IS NOT NULL
),
`latest_jobs` AS (
  SELECT
    `workspace_id`,
    `job_id`,
    `name` AS `job_name`,
    `deployment`.`metadata_file_path` AS `metadata_file_path`,
    ROW_NUMBER() OVER (
      PARTITION BY `workspace_id`, `job_id`
      ORDER BY `change_time` DESC
    ) AS `rn`
  FROM `system`.`lakeflow`.`jobs`
  WHERE `workspace_id` = '7474655075961307'
    AND `delete_time` IS NULL
    AND `job_id` IS NOT NULL
    AND `change_time` IS NOT NULL
    AND `name` IS NOT NULL
    AND `name` IN ('prod_fraud_setup', 'prod_fraud_training', 'prod_fraud_batch_scoring', 'prod_fraud_online_deploy')
),
`project_jobs` AS (
  SELECT
    p.`name` AS `project_name`,
    j.`workspace_id`,
    j.`job_id`,
    j.`job_name`
  FROM `projects` p
  JOIN `latest_jobs` j
    ON j.`rn` = 1
   AND j.`metadata_file_path` IS NOT NULL
   AND j.`metadata_file_path` ILIKE CONCAT('%/', p.`name`, '/prod/%')
),
`dedup_runs` AS (
  SELECT
    `workspace_id`,
    `job_id`,
    `run_id`,
    `period_start_time`,
    `period_end_time`,
    `result_state`,
    ROW_NUMBER() OVER (
      PARTITION BY `workspace_id`, `run_id`
      ORDER BY `period_end_time` DESC
    ) AS `rn`
  FROM `system`.`lakeflow`.`job_run_timeline`
  WHERE `workspace_id` = '7474655075961307'
    AND `job_id` IS NOT NULL
    AND `run_id` IS NOT NULL
    AND `period_start_time` IS NOT NULL
    AND `period_end_time` IS NOT NULL
),
`latest_run_per_job` AS (
  SELECT
    pj.`project_name`,
    pj.`job_name`,
    r.`run_id`,
    r.`period_start_time`,
    r.`period_end_time`,
    r.`result_state`,
    ROW_NUMBER() OVER (
      PARTITION BY pj.`project_name`, pj.`job_id`
      ORDER BY r.`period_start_time` DESC
    ) AS `rn`
  FROM `project_jobs` pj
  LEFT JOIN `dedup_runs` r
    ON pj.`workspace_id` = r.`workspace_id`
   AND pj.`job_id` = r.`job_id`
   AND r.`rn` = 1
)
SELECT
  `project_name`,
  `job_name`,
  `run_id`,
  `period_start_time` AS `latest_run_start_time`,
  `period_end_time` AS `latest_run_end_time`,
  CASE WHEN `result_state` IS NULL THEN 'IN_PROGRESS' ELSE `result_state` END AS `latest_run_status`
FROM `latest_run_per_job`
WHERE `rn` = 1
ORDER BY `project_name`, `job_name`;
```

Result:

| project_name | job_name | run_id | latest_run_start_time | latest_run_end_time | latest_run_status |
|---|---|---|---|---|---|
| databricks-tech-bar-fraud-project | prod_fraud_batch_scoring | 353407243695613 | 2026-10-30T03:29:36.178Z | 2026-10-30T03:31:26.946Z | SUCCEEDED |
| databricks-tech-bar-fraud-project | prod_fraud_online_deploy | 755720320337683 | 2026-10-30T03:31:49.730Z | 2026-10-30T03:41:48.285Z | SUCCEEDED |
| databricks-tech-bar-fraud-project | prod_fraud_setup | 622643183755757 | 2026-10-30T03:20:32.769Z | 2026-10-30T03:22:40.569Z | SUCCEEDED |
| databricks-tech-bar-fraud-project | prod_fraud_training | 874169827000330 | 2026-10-30T03:23:06.997Z | 2026-10-30T03:29:12.971Z | SUCCEEDED |

Genie answer: For **databricks-tech-bar-fraud-project**, the latest run of **every prod job** shown is **SUCCEEDED**. The four prod jobs are **prod_fraud_setup**, **prod_fraud_training**, **prod_fraud_batch_scoring**, and **prod_fraud_online_deploy**; the latest run started between **03:20 UTC** and **03:31 UTC** on **2026-10-30**, and all completed successfully.

## 4. How many transactions did the latest batch scoring classify as fraud?

- Status: `COMPLETED`, conversation `01f1d417f31310bb9ea650083722dd7c`

Generated SQL:

```sql
WITH `latest_batch` AS (
  SELECT MAX(`scored_at`) AS `max_scored_at`
  FROM `vr_workspace`.`tech_bar`.`fraud_batch_predictions`
)
SELECT COUNT(*) AS `fraud_transaction_count`
FROM `vr_workspace`.`tech_bar`.`fraud_batch_predictions` AS `p`
CROSS JOIN `latest_batch` AS `lb`
WHERE `p`.`scored_at` = `lb`.`max_scored_at`
  AND `p`.`prediction` = 1
```

Result:

| fraud_transaction_count |
|---|
| 43054 |

Genie answer: The latest batch scoring classified **43,054 transactions** as fraud, based on rows with the most recent `scored_at` value and `prediction = 1`. Since the result contains **1 row**, this is the total fraud count for the latest batch scoring snapshot returned by the data.

## 5. What is the daily request volume of the serving endpoint?

- Status: `COMPLETED`, conversation `01f1d417f31311c98050a0463cd24143`

Generated SQL:

```sql
SELECT `request_date`, COUNT(*) AS `request_volume`
FROM `vr_workspace`.`tech_bar`.`fraud_serving_inference_payload`
WHERE `request_date` IS NOT NULL
GROUP BY `request_date`
ORDER BY `request_date`
```

Result:

| request_date | request_volume |
|---|---|
| 2026-10-30 | 1 |

Genie answer: The serving endpoint had **1** request on **2026-10-30**. Based on the visible data, **2026-10-30** is the only date shown and its daily request volume is **1**.

