import { App, Tags } from 'aws-cdk-lib';

import { getStageConfig } from '../lib/config/stage.js';
import { ApiStack } from '../lib/stacks/api-stack.js';
import { DataStack } from '../lib/stacks/data-stack.js';
import { NetworkingStack } from '../lib/stacks/networking-stack.js';

const app = new App();

const resolvedStage =
  (app.node.tryGetContext('stage') as string | undefined) ?? process.env.STAGE ?? 'dev';
const stageConfig = getStageConfig(resolvedStage);

const env = {
  account: stageConfig.accountId,
  region: stageConfig.region,
};

const networkingStack = new NetworkingStack(app, `FillDesk-${stageConfig.stage}-Networking`, {
  env,
  stageConfig,
});

const dataStack = new DataStack(app, `FillDesk-${stageConfig.stage}-Data`, {
  env,
  stageConfig,
  vpc: networkingStack.vpc,
  rdsSecurityGroup: networkingStack.rdsSecurityGroup,
});

const apiStack = new ApiStack(app, `FillDesk-${stageConfig.stage}-Api`, {
  env,
  stageConfig,
  vpc: networkingStack.vpc,
  apiLambdaSecurityGroup: networkingStack.apiLambdaSecurityGroup,
  databaseSecret: dataStack.dbSecret,
  databaseHost: dataStack.database.dbInstanceEndpointAddress,
  databasePort: dataStack.database.dbInstanceEndpointPort,
  webhookQueue: dataStack.webhookQueue,
});

dataStack.addDependency(networkingStack);
apiStack.addDependency(networkingStack);
apiStack.addDependency(dataStack);

Tags.of(app).add('Project', 'filldesk-notetaker');
Tags.of(app).add('Stage', stageConfig.stage);
Tags.of(app).add('Owner', 'sam');