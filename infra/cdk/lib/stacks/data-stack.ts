import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps,
  Tags,
} from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

import type { StageConfig } from '../config/stage.js';
import { DbSchedule } from '../constructs/db-schedule.js';

export interface DataStackProps extends StackProps {
  stageConfig: StageConfig;
  vpc: ec2.IVpc;
  rdsSecurityGroup: ec2.ISecurityGroup;
}

export class DataStack extends Stack {
  public readonly database: rds.DatabaseInstance;
  public readonly dbSecret: secretsmanager.ISecret;
  public readonly webhookQueue: sqs.Queue;
  public readonly webhookDlq: sqs.Queue;

  public constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    const { stageConfig } = props;
    const normalizedInstanceType = stageConfig.dbInstanceClass.replace(/^db\./, '');

    const dbCredentials = rds.Credentials.fromGeneratedSecret('filldesk_admin', {
      secretName: `filldesk/${stageConfig.stage}/database/credentials`,
    });

    this.database = new rds.DatabaseInstance(this, 'PostgresInstance', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: new ec2.InstanceType(normalizedInstanceType),
      allocatedStorage: stageConfig.dbAllocatedStorage,
      multiAz: stageConfig.dbMultiAz,
      autoMinorVersionUpgrade: true,
      backupRetention: Duration.days(stageConfig.dbBackupRetention),
      credentials: dbCredentials,
      databaseName: 'filldesk',
      deletionProtection: stageConfig.dbDeletionProtection,
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [props.rdsSecurityGroup],
      removalPolicy: stageConfig.stage === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    Tags.of(this.database).add('auto-stop', stageConfig.stage === 'dev' ? 'true' : 'false');

    if (!this.database.secret) {
      throw new Error('Expected database secret to be created for RDS instance');
    }

    this.dbSecret = this.database.secret;

    this.webhookDlq = new sqs.Queue(this, 'WebhookDeadLetterQueue', {
      queueName: `${stageConfig.stage}-webhook-dlq`,
      retentionPeriod: Duration.days(14),
    });

    this.webhookQueue = new sqs.Queue(this, 'WebhookProcessingQueue', {
      queueName: `${stageConfig.stage}-webhook-processing`,
      visibilityTimeout: Duration.seconds(stageConfig.webhookQueueVisibilityTimeout),
      deadLetterQueue: {
        queue: this.webhookDlq,
        maxReceiveCount: stageConfig.webhookDlqMaxReceiveCount,
      },
    });

    if (stageConfig.stage === 'dev') {
      new DbSchedule(this, 'DevDbSchedule', {
        dbInstanceIdentifier: this.database.instanceIdentifier,
      });
    }

    new CfnOutput(this, 'DatabaseEndpoint', {
      value: this.database.dbInstanceEndpointAddress,
      exportName: `${stageConfig.stage}-database-endpoint`,
    });

    new CfnOutput(this, 'DatabasePort', {
      value: this.database.dbInstanceEndpointPort,
      exportName: `${stageConfig.stage}-database-port`,
    });

    new CfnOutput(this, 'DatabaseSecretArn', {
      value: this.dbSecret.secretArn,
      exportName: `${stageConfig.stage}-database-secret-arn`,
    });

    new CfnOutput(this, 'WebhookQueueUrl', {
      value: this.webhookQueue.queueUrl,
      exportName: `${stageConfig.stage}-webhook-queue-url`,
    });

    new CfnOutput(this, 'WebhookDlqUrl', {
      value: this.webhookDlq.queueUrl,
      exportName: `${stageConfig.stage}-webhook-dlq-url`,
    });
  }
}
