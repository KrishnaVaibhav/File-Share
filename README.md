# CloudFormation For the Application
```
AWSTemplateFormatVersion: 2010-09-09
Description: "Cloud formation for File Shsre web application -> Ec2, S3, Lambda, VPC, SNS, SQS, DynamoDB"

Resources:
  FileStorageBucket:
    Type: "AWS::S3::Bucket"
    Properties:
      BucketName: filesshare-krishna
      LifecycleConfiguration:
        Rules:
          - Id: ExpireOldObjects
            Status: Enabled
            ExpirationInDays: 1
      PublicAccessBlockConfiguration:
        BlockPublicAcls: false
        IgnorePublicAcls: false
        BlockPublicPolicy: false
        RestrictPublicBuckets: false

  FileStorageBucketPolicy:
    Type: "AWS::S3::BucketPolicy"
    Properties:
      Bucket: !Ref FileStorageBucket
      PolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: "Allow"
            Principal: "*"
            Action:
              - "s3:GetObject"
              - "s3:PutObject"
            Resource: !Sub "arn:aws:s3:::${FileStorageBucket}/*"

  UserDynamoDBTable:
    Type: "AWS::DynamoDB::Table"
    Properties:
      TableName: UserTable
      AttributeDefinitions:
        - AttributeName: user
          AttributeType: S
      KeySchema:
        - AttributeName: user
          KeyType: HASH
      BillingMode: PAY_PER_REQUEST

  DataBackupVault:
    Type: "AWS::Backup::BackupVault"
    Properties:
      BackupVaultName: FileShareBackupVault

  FileShareBackupPlan:
    Type: "AWS::Backup::BackupPlan"
    Properties:
      BackupPlan:
        BackupPlanName: FileShareBackupPlan
        BackupPlanRule:
          - RuleName: DailyBackup
            TargetBackupVault: !Ref DataBackupVault
            ScheduleExpression: cron(0 12 * * ? *)
            StartWindowMinutes: 60
            CompletionWindowMinutes: 10080
            Lifecycle:
              DeleteAfterDays: 30

  MyBackupSelection:
    Type: "AWS::Backup::BackupSelection"
    Properties:
      BackupPlanId: !Ref FileShareBackupPlan
      BackupSelection:
        SelectionName: FileShareSelection
        IamRoleArn: arn:aws:iam::730335407937:role/LabRole
        Resources:
          - !GetAtt UserDynamoDBTable.Arn
          - !GetAtt FileStorageBucket.Arn

  MySSMParameter:
    Type: "AWS::SSM::Parameter"
    Properties:
      Name: "urlone"
      Type: "String"
      Value:
        Fn::Sub: "https://${ApiGatewayRestApi}.execute-api.${AWS::Region}.amazonaws.com/prod/subscribe-email"

  MySSMParameter2:
    Type: "AWS::SSM::Parameter"
    Properties:
      Name: "urltwo"
      Type: "String"
      Value:
        Fn::Sub: "https://${ApiGatewayRestApi}.execute-api.${AWS::Region}.amazonaws.com/prod/publish-message"

  FileShareVPC:
    Type: "AWS::EC2::VPC"
    Properties:
      CidrBlock: "10.0.0.0/16"
      EnableDnsSupport: true
      EnableDnsHostnames: true
      Tags:
        - Key: Name
          Value: FileShareVPC

  PublicSubnet:
    Type: "AWS::EC2::Subnet"
    Properties:
      VpcId: !Ref FileShareVPC
      CidrBlock: "10.0.1.0/24"
      MapPublicIpOnLaunch: true
      AvailabilityZone: !Select [0, !GetAZs ""]
      Tags:
        - Key: Name
          Value: PublicSubnet

  InternetGateway:
    Type: "AWS::EC2::InternetGateway"
    Properties:
      Tags:
        - Key: Name
          Value: FileshareIG

  GatewayAttachment:
    Type: "AWS::EC2::VPCGatewayAttachment"
    Properties:
      VpcId: !Ref FileShareVPC
      InternetGatewayId: !Ref InternetGateway
  PublicRouteTable:
    Type: "AWS::EC2::RouteTable"
    Properties:
      VpcId: !Ref FileShareVPC
      Tags:
        - Key: Name
          Value: PublicRouteTable

  PublicRoute:
    Type: "AWS::EC2::Route"
    DependsOn: GatewayAttachment
    Properties:
      RouteTableId: !Ref PublicRouteTable
      DestinationCidrBlock: "0.0.0.0/0"
      GatewayId: !Ref InternetGateway

  PublicSubnetRouteTableAssociation:
    Type: "AWS::EC2::SubnetRouteTableAssociation"
    Properties:
      SubnetId: !Ref PublicSubnet
      RouteTableId: !Ref PublicRouteTable

  EC2Instance:
    Type: "AWS::EC2::Instance"
    DependsOn:
      - ApiGatewayDeployment
    Properties:
      InstanceType: t2.medium
      KeyName: file-transfer
      ImageId: ami-080e1f13689e07408
      SubnetId: !Ref PublicSubnet
      IamInstanceProfile: LabInstanceProfile
      SecurityGroupIds:
        - !GetAtt InstanceSecurityGroup.GroupId
      UserData:
        Fn::Base64: !Sub |
          #!/bin/bash
          sudo apt-get update -y
          sudo apt install awscli -y
          cd /home/ubuntu  
          curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
          source ~/.bashrc
          nvm install 20
          git clone https://github.com/KrishnaVaibhav/File-Share.git
          cd File-Share
          IP=$(curl http://169.254.169.254/latest/meta-data/public-ipv4)
          echo REACT_APP_SERVER_IP=http://$IP:5000 > .env
          sudo apt-get install python3-pip -y
          sudo pip3 install -r requirements.txt
          API_URL_S=$( aws ssm get-parameter --name "urlone" --query "Parameter.Value" --output text --region us-east-1)
          API_URL_P=$( aws ssm get-parameter --name "urltwo" --query "Parameter.Value" --output text --region us-east-1)
          echo "subscribe="$API_URL_S > url.txt
          echo "publish="$API_URL_P >> url.txt
          sudo apt-get install npm -y
          sudo npm install
          sudo python3 publish.py & sudo npm start

  InstanceSecurityGroup:
    Type: "AWS::EC2::SecurityGroup"
    Properties:
      GroupDescription: "Enable SSH access and HTTP access on the inbound port"
      VpcId: !Ref FileShareVPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: "22"
          ToPort: "22"
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: "80"
          ToPort: "80"
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: "443"
          ToPort: "443"
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: "3000"
          ToPort: "3000"
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: "5000"
          ToPort: "5000"
          CidrIp: 0.0.0.0/0

  LambdaSubscribeEmailFunction:
    Type: "AWS::Lambda::Function"
    Properties:
      Handler: "index.lambda_handler"
      Role: arn:aws:iam::730335407937:role/LabRole
      FunctionName: "LambdaSubscribeEmailFunction"
      Runtime: "python3.8"
      Timeout: 300
      Code:
        ZipFile: |
          import boto3
          import json
          def lambda_handler(event, context):
              if isinstance(event.get('body'), str):
                  try:
                      event = json.loads(event['body'])
                  except json.JSONDecodeError:
                      return {
                          'statusCode': 400,
                          'body': json.dumps({'error': 'Invalid JSON format'})
                      }
              topic_name = event.get('topic_name')
              email_address = event.get('email_address')
              if not topic_name or not email_address:
                  missing_params = [param for param in ["topic_name", "email_address"] if not event.get(param)]
                  return {
                      'statusCode': 400,
                      'body': json.dumps({'error': f'Missing required parameter(s): {", ".join(missing_params)}'})
                  }
              sns_client = boto3.client('sns')
              print(topic_name)
              print(email_address)
              try:
                  create_topic_response = sns_client.create_topic(Name=topic_name)
                  topic_arn = create_topic_response['TopicArn']
                  subscribe_response = sns_client.subscribe(
                      TopicArn=topic_arn,
                      Protocol='email',
                      Endpoint=email_address
                  )
                  return {
                      'statusCode': 200,
                      'body': json.dumps({
                          'message': f"Subscription request sent to {email_address}.",
                          'TopicArn': topic_arn,
                          'SubscriptionArn': subscribe_response['SubscriptionArn']
                      })
                  }
              except Exception as e:
                  print(f"Error: {str(e)}")
                  return {
                      'statusCode': 500,
                      'body': json.dumps({'error': f"Error processing request: {str(e)}"})
                  }

  LambdaPublishMessageFunction:
    Type: "AWS::Lambda::Function"
    Properties:
      Handler: "index.lambda_handler"
      Role: arn:aws:iam::730335407937:role/LabRole
      FunctionName: "LambdaPublishMessageFunction"
      Runtime: "python3.8"
      Timeout: 300
      Code:
        ZipFile: |
          import boto3
          import json
          def lambda_handler(event, context):
              if isinstance(event.get("body"), str):
                  try:
                      event = json.loads(event["body"])
                  except json.JSONDecodeError:
                      return {
                          "statusCode": 400,
                          "body": json.dumps({"error": "Invalid JSON format"}),
                      }

              topic_arn = event.get("topic_arn")
              message = event.get("message")
              if not topic_arn or not message:
                  missing_params = [
                      param for param in ["topic_arn", "message"] if not event.get(param)
                  ]
                  return {
                      "statusCode": 400,
                      "body": json.dumps(
                          {"error": f'Missing required parameter(s): {", ".join(missing_params)}'}
                      ),
                  }
              sns_client = boto3.client("sns")
              print("arn: " + topic_arn)
              print(message)
              try:
                  topic_arn = event["topic_arn"]
                  message = event["message"]
                  print(topic_arn)
                  response = sns_client.publish(TopicArn=topic_arn, Message=message)
                  return {
                      "statusCode": 200,
                      "body": json.dumps("Message sent to the topic subscribers."),
                  }
              except Exception as e:
                  print(f"Error: {str(e)}")
                  return {
                      "statusCode": 500,
                      "body": json.dumps(f"Error sending message: {str(e)}"),
                  }

  ApiGatewayRestApi:
    Type: "AWS::ApiGateway::RestApi"
    Properties:
      Name: "LambdaInvocationApi"

  SubscribeEmailApiResource:
    Type: "AWS::ApiGateway::Resource"
    Properties:
      ParentId: !GetAtt ApiGatewayRestApi.RootResourceId
      PathPart: "subscribe-email"
      RestApiId: !Ref ApiGatewayRestApi

  PublishMessageApiResource:
    Type: "AWS::ApiGateway::Resource"
    Properties:
      ParentId: !GetAtt ApiGatewayRestApi.RootResourceId
      PathPart: "publish-message"
      RestApiId: !Ref ApiGatewayRestApi

  SubscribeEmailMethod:
    Type: "AWS::ApiGateway::Method"
    Properties:
      AuthorizationType: "NONE"
      HttpMethod: "POST"
      ResourceId: !Ref SubscribeEmailApiResource
      RestApiId: !Ref ApiGatewayRestApi
      Integration:
        IntegrationHttpMethod: "POST"
        Type: "AWS_PROXY"
        Uri: !Sub "arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${LambdaSubscribeEmailFunction.Arn}/invocations"

  PublishMessageMethod:
    Type: "AWS::ApiGateway::Method"
    Properties:
      AuthorizationType: "NONE"
      HttpMethod: "POST"
      ResourceId: !Ref PublishMessageApiResource
      RestApiId: !Ref ApiGatewayRestApi
      Integration:
        IntegrationHttpMethod: "POST"
        Type: "AWS_PROXY"
        Uri: !Sub "arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${LambdaPublishMessageFunction.Arn}/invocations"

  ApiGatewayDeployment:
    Type: "AWS::ApiGateway::Deployment"
    DependsOn:
      - SubscribeEmailMethod
      - PublishMessageMethod
    Properties:
      RestApiId: !Ref ApiGatewayRestApi
      StageName: "prod"

  LambdaInvokePermission:
    Type: "AWS::Lambda::Permission"
    Properties:
      Action: "lambda:InvokeFunction"
      FunctionName: !GetAtt LambdaSubscribeEmailFunction.Arn
      Principal: "apigateway.amazonaws.com"

  LambdaInvokePermission2:
    Type: "AWS::Lambda::Permission"
    Properties:
      Action: "lambda:InvokeFunction"
      FunctionName: !GetAtt LambdaPublishMessageFunction.Arn
      Principal: "apigateway.amazonaws.com"

Outputs:
  WebsiteURL:
    Description: "URL of the React webapplicaiton"
    Value: !Sub "http://${EC2Instance.PublicDnsName}:3000"
```
