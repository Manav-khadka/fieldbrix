"""Minimal, observable queue worker used by the Sprint 01 local platform."""

from __future__ import annotations

import json
import logging
import os
import time

import boto3
from botocore.exceptions import ClientError


logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"), format="%(message)s")
LOGGER = logging.getLogger("fieldbrix.queue_worker")


def main() -> None:
    queue_url = os.environ["SQS_QUEUE_URL"]
    client = boto3.client(
        "sqs",
        region_name=os.environ.get("AWS_REGION", "ap-south-1"),
        endpoint_url=os.environ.get("AWS_ENDPOINT_URL"),
    )

    while True:
        try:
            response = client.receive_message(
                QueueUrl=queue_url,
                MaxNumberOfMessages=1,
                WaitTimeSeconds=10,
            )
        except ClientError as error:
            LOGGER.warning(
                json.dumps(
                    {
                        "event": "queue.receive_unavailable",
                        "error_code": error.response.get("Error", {}).get("Code"),
                    },
                ),
            )
            time.sleep(1)
            continue
        for message in response.get("Messages", []):
            LOGGER.info(json.dumps({"event": "queue.message_received", "message_id": message["MessageId"]}))
            client.delete_message(QueueUrl=queue_url, ReceiptHandle=message["ReceiptHandle"])
            LOGGER.info(json.dumps({"event": "queue.message_acknowledged", "message_id": message["MessageId"]}))
        time.sleep(0.1)


if __name__ == "__main__":
    main()
