# Real request to `prod_fraud_serving`

The endpoint is route-optimized, so it is queried on its data plane with OAuth through the Databricks SDK (`databricks-sdk`, profile `vr-workspace`):

```python
from databricks.sdk import WorkspaceClient

w = WorkspaceClient(profile="vr-workspace")
resp = w.serving_endpoints_data_plane.query(
    name="prod_fraud_serving",
    dataframe_records=[
        {"holder_id": "H0026806432", "created_at_brt": "2026-10-28T23:59:58", "amount": 68.24},
        {"holder_id": "H5162324024", "created_at_brt": "2026-10-28T23:59:54", "amount": 15000.0},
    ],
)
print(resp.as_dict())
```

- Request: [`request.json`](request.json). Only `holder_id`, `created_at_brt` and `amount` are sent; the endpoint resolves the 6 batch features by online lookup in the Lakebase online store (`feature-store-online`) and the on-demand features from the request, through the feature spec logged with the model.
- Response: [`response.json`](response.json). `predictions` holds the predicted class (`1` = fraud) of each record, as returned by the model of the template.
- The same request and response, logged by the AI Gateway inference table: [`inference_payload.json`](inference_payload.json) (status 200, 15 ms).
