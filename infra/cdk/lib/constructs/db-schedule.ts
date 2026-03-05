import { Duration } from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import path from 'node:path';

export interface DbScheduleProps {
  dbInstanceIdentifier: string;
}

export class DbSchedule extends Construct {
  public constructor(scope: Construct, id: string, props: DbScheduleProps) {
    super(scope, id);

    const schedulerFunction = new NodejsFunction(this, 'DbSchedulerFunction', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(process.cwd(), 'lib/handlers/db-scheduler-handler.ts'),
      timeout: Duration.seconds(30),
      memorySize: 128,
      environment: {
        DB_INSTANCE_IDENTIFIER: props.dbInstanceIdentifier,
      },
      bundling: {
        minify: false,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
      },
    });

    schedulerFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['rds:DescribeDBInstances', 'rds:StartDBInstance', 'rds:StopDBInstance'],
        resources: ['*'],
      }),
    );

    const stopRule = new events.Rule(this, 'StopDbRule', {
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '20',
        weekDay: 'MON-FRI',
      }),
    });

    stopRule.addTarget(
      new targets.LambdaFunction(schedulerFunction, {
        event: events.RuleTargetInput.fromObject({
          action: 'stop',
        }),
      }),
    );

    const startRule = new events.Rule(this, 'StartDbRule', {
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '8',
        weekDay: 'MON-FRI',
      }),
    });

    startRule.addTarget(
      new targets.LambdaFunction(schedulerFunction, {
        event: events.RuleTargetInput.fromObject({
          action: 'start',
        }),
      }),
    );
  }
}
