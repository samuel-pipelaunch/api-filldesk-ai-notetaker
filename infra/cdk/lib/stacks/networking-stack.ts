import { Stack, type StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

import type { StageConfig } from '../config/stage.js';

export interface NetworkingStackProps extends StackProps {
  stageConfig: StageConfig;
}

export class NetworkingStack extends Stack {
  public readonly vpc: ec2.Vpc;
  public readonly apiLambdaSecurityGroup: ec2.SecurityGroup;
  public readonly rdsSecurityGroup: ec2.SecurityGroup;

  public constructor(scope: Construct, id: string, props: NetworkingStackProps) {
    super(scope, id, props);

    const natGateways = props.stageConfig.stage === 'prod' ? 2 : 1;

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways,
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'private-app',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'private-data',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    this.apiLambdaSecurityGroup = new ec2.SecurityGroup(this, 'ApiLambdaSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for API/webhook Lambda functions',
      allowAllOutbound: true,
    });

    this.rdsSecurityGroup = new ec2.SecurityGroup(this, 'RdsSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for RDS PostgreSQL',
      allowAllOutbound: true,
    });

    this.rdsSecurityGroup.addIngressRule(
      this.apiLambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow PostgreSQL from API Lambda security group',
    );
  }
}
