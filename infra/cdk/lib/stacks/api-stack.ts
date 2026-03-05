import { CfnOutput, Duration, SecretValue, Stack, type StackProps } from 'aws-cdk-lib';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import path from 'node:path';
import type { StageConfig } from '../config/stage.js';

export interface ApiStackProps extends StackProps {
  stageConfig: StageConfig;
  vpc: ec2.IVpc;
  apiLambdaSecurityGroup: ec2.ISecurityGroup;
  databaseSecret: secretsmanager.ISecret;
  databaseHost: string;
  databasePort: string;
  webhookQueue: sqs.IQueue;
}

function toRetentionDays(days: number): logs.RetentionDays {
  if (days === 7) {
    return logs.RetentionDays.ONE_WEEK;
  }

  if (days === 30) {
    return logs.RetentionDays.ONE_MONTH;
  }

  if (days === 90) {
    return logs.RetentionDays.THREE_MONTHS;
  }

  return logs.RetentionDays.ONE_WEEK;
}

export class ApiStack extends Stack {
  public readonly apiLambda: NodejsFunction;
  public readonly webhookProcessorLambda: NodejsFunction;
  public readonly httpApi: apigwv2.HttpApi;

  public constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { stageConfig } = props;
    const cdkRoot = process.cwd();
    const webBaseUrl = stageConfig.domainName ? `https://${stageConfig.domainName}` : 'http://localhost:3000';
    const apiBaseUrl = stageConfig.domainName
      ? `https://api.${stageConfig.domainName}`
      : `https://api-${stageConfig.stage}.local`;

    const appSecrets = new secretsmanager.Secret(this, 'ApiApplicationSecrets', {
      secretName: `filldesk/${stageConfig.stage}/api/application-secrets`,
      secretObjectValue: {
        RECALL_API_KEY: SecretValue.unsafePlainText('CHANGEME_RECALL_API_KEY'),
        RECALL_WEBHOOK_SECRET: SecretValue.unsafePlainText(
          'CHANGEME_RECALL_WEBHOOK_SECRET',
        ),
        GOOGLE_CLIENT_ID: SecretValue.unsafePlainText('CHANGEME_GOOGLE_CLIENT_ID'),
        GOOGLE_CLIENT_SECRET: SecretValue.unsafePlainText(
          'CHANGEME_GOOGLE_CLIENT_SECRET',
        ),
        INTERNAL_ADMIN_KEY: SecretValue.unsafePlainText('CHANGEME_INTERNAL_ADMIN_KEY'),
      },
    });

    const databaseUrl = [
      'postgres://',
      props.databaseSecret.secretValueFromJson('username').toString(),
      ':',
      props.databaseSecret.secretValueFromJson('password').toString(),
      '@',
      props.databaseHost,
      ':',
      props.databasePort,
      '/filldesk',
      '?sslmode=require',
    ].join('');

    this.apiLambda = new NodejsFunction(this, 'ApiLambda', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(cdkRoot, '../../apps/api/src/lambda.ts'),
      handler: 'handler',
      memorySize: stageConfig.apiMemorySize,
      timeout: Duration.seconds(stageConfig.apiTimeout),
      logRetention: toRetentionDays(stageConfig.logRetentionDays),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [props.apiLambdaSecurityGroup],
      environment: {
        STAGE: stageConfig.stage,
        DATABASE_URL: databaseUrl,
        RECALL_API_KEY: appSecrets.secretValueFromJson('RECALL_API_KEY').toString(),
        RECALL_WEBHOOK_SECRET: appSecrets.secretValueFromJson('RECALL_WEBHOOK_SECRET').toString(),
        RECALL_REGION: stageConfig.region,
        GOOGLE_CLIENT_ID: appSecrets.secretValueFromJson('GOOGLE_CLIENT_ID').toString(),
        GOOGLE_CLIENT_SECRET: appSecrets.secretValueFromJson('GOOGLE_CLIENT_SECRET').toString(),
        GOOGLE_REDIRECT_URI: `${apiBaseUrl}/api/v1/google/callback`,
        API_BASE_URL: apiBaseUrl,
        WEB_BASE_URL: webBaseUrl,
        WEBHOOK_QUEUE_URL: props.webhookQueue.queueUrl,
        LOG_LEVEL: stageConfig.stage === 'dev' ? 'debug' : 'info',
        INTERNAL_ADMIN_KEY: appSecrets.secretValueFromJson('INTERNAL_ADMIN_KEY').toString(),
      },
      bundling: {
        minify: stageConfig.stage === 'prod',
        sourceMap: true,
        format: OutputFormat.ESM,
        target: 'node20',
      },
    });

    this.webhookProcessorLambda = new NodejsFunction(this, 'WebhookProcessorLambda', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(cdkRoot, 'lib/handlers/webhook-processor.ts'),
      handler: 'handler',
      memorySize: stageConfig.webhookProcessorMemorySize,
      timeout: Duration.seconds(stageConfig.apiTimeout),
      logRetention: toRetentionDays(stageConfig.logRetentionDays),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [props.apiLambdaSecurityGroup],
      environment: {
        STAGE: stageConfig.stage,
        DATABASE_URL: databaseUrl,
        RECALL_API_KEY: appSecrets.secretValueFromJson('RECALL_API_KEY').toString(),
        RECALL_REGION: stageConfig.region,
        WEBHOOK_QUEUE_URL: props.webhookQueue.queueUrl,
        LOG_LEVEL: stageConfig.stage === 'dev' ? 'debug' : 'info',
      },
      bundling: {
        minify: stageConfig.stage === 'prod',
        sourceMap: true,
      },
    });

    this.webhookProcessorLambda.addEventSource(
      new SqsEventSource(props.webhookQueue, {
        batchSize: 1,
      }),
    );

    props.databaseSecret.grantRead(this.apiLambda);
    props.databaseSecret.grantRead(this.webhookProcessorLambda);
    appSecrets.grantRead(this.apiLambda);
    appSecrets.grantRead(this.webhookProcessorLambda);
    props.webhookQueue.grantSendMessages(this.apiLambda);
    props.webhookQueue.grantConsumeMessages(this.webhookProcessorLambda);

    this.httpApi = new apigwv2.HttpApi(this, 'ApiGateway', {
      createDefaultStage: false,
      corsPreflight: {
        allowHeaders: ['Authorization', 'Content-Type', 'X-Requested-With', 'X-Admin-Key'],
        allowMethods: [
          apigwv2.CorsHttpMethod.ANY,
          apigwv2.CorsHttpMethod.OPTIONS,
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PUT,
          apigwv2.CorsHttpMethod.PATCH,
          apigwv2.CorsHttpMethod.DELETE,
        ],
        allowOrigins: [webBaseUrl],
      },
    });

    const apiIntegration = new HttpLambdaIntegration('ApiLambdaIntegration', this.apiLambda);

    this.httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigwv2.HttpMethod.ANY],
      integration: apiIntegration,
    });

    this.httpApi.addRoutes({
      path: '/',
      methods: [apigwv2.HttpMethod.ANY],
      integration: apiIntegration,
    });

    new apigwv2.HttpStage(this, 'DefaultHttpStage', {
      httpApi: this.httpApi,
      stageName: '$default',
      autoDeploy: true,
      throttle: {
        rateLimit: stageConfig.stage === 'dev' ? 100 : 1000,
        burstLimit: stageConfig.stage === 'dev' ? 100 : 1000,
      },
    });

    new CfnOutput(this, 'ApiUrl', {
      value: this.httpApi.apiEndpoint,
      exportName: `${stageConfig.stage}-api-url`,
    });

    new CfnOutput(this, 'WebhookUrl', {
      value: `${this.httpApi.apiEndpoint}/webhooks/recall`,
      exportName: `${stageConfig.stage}-webhook-url`,
    });
  }
}
