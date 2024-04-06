from flask import Blueprint, request, jsonify, Flask
import boto3
import os
import requests

file_transfer = Blueprint("file_transfer", __name__)
aws_region = "us-east-1"
file_path = "url.txt"
message = ""
arn = ""

dynamodb = boto3.resource("dynamodb", region_name=aws_region)
s3 = boto3.client("s3", region_name=aws_region)

USER_TABLE = "UserTable"
S3_BUCKET_NAME = "filesshare-krishna"

with open(file_path, "r") as file:
    file_contents = file.readlines()
    subscribe = file_contents[0].strip().split("=")[1]
    publish = file_contents[1].strip().split("=")[1]
    print(subscribe)
    print(publish)


@file_transfer.after_request
def add_headers(response):
    response.headers.add(
        "Access-Control-Allow-Headers",
        "Access-Control-Allow-Headers, Origin, Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers",
    )
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    return response


@file_transfer.route("/subscribe", methods=["POST"])
def subscribe_email():
    username = request.form["username"]
    table = dynamodb.Table(USER_TABLE)
    tdata = table.get_item(Key={"user": username})
    email = tdata["Item"]["email"]
    arn = tdata["Item"].get("arn")
    if arn is None:
        payload = {"email_address": email, "topic_name": username}
        response = requests.post(subscribe, json=payload)
        if response.status_code == 200:
            arn = response.json()["TopicArn"]
            tdata["Item"]["arn"] = arn
            table.put_item(Item=tdata["Item"])
            return jsonify({"message": "Email subscribed successfully"})
        else:
            return jsonify({"message": "Failed to subscribe email"})
    else:
        return jsonify({"message": "Email already subscribed"})

    return jsonify({"message": "Email subscribed successfully"})


# @file_transfer.route("/publish", methods=["POST"])
def publish_message(username, message):
    table = dynamodb.Table(USER_TABLE)
    tdata = table.get_item(Key={"user": username})
    arn = tdata["Item"]["arn"]
    payload = {"topic_arn": arn, "message": message}
    response = requests.post(publish, json=payload)
    if response.status_code == 200:
        return jsonify({"message": "Message published successfully"})
    else:
        return jsonify({"message": "Failed to publish message"})


@file_transfer.route("/register", methods=["POST"])
def register_user():
    username = request.form["username"]
    email = request.form["email"]
    password = request.form["password"]
    table = dynamodb.Table(USER_TABLE)
    table.put_item(Item={"user": username, "email": email, "password": password})

    return jsonify({"message": "User registered successfully"})


@file_transfer.route("/login", methods=["POST"])
def login_user():
    username = request.form["username"]
    password = request.form["password"]
    table = dynamodb.Table(USER_TABLE)
    response = table.get_item(Key={"user": username})
    if "Item" in response:
        stored_password = response["Item"].get("password")
        if password == stored_password:
            return jsonify({"message": "Login successful"})
    return jsonify({"message": "Invalid username or password"}), 400


@file_transfer.route("/file", methods=["POST"])
def create_user():
    username = request.form["username"]
    data = request.files["file"]
    file_name = f"{username}/{data.filename}"

    s3.upload_fileobj(data, S3_BUCKET_NAME, file_name)

    presigned_url = s3.generate_presigned_url(
        ClientMethod="get_object",
        Params={"Bucket": S3_BUCKET_NAME, "Key": file_name},
        ExpiresIn=86400,
    )
    publish_message(username, presigned_url)
    return jsonify(
        {"message": "File Uploaded successfully", "presigned_url": presigned_url}
    )


if __name__ == "__main__":

    app = Flask(__name__)
    app.register_blueprint(file_transfer)

    app.run(host="0.0.0.0", port=5000)
