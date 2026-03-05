export type StageName = 'dev' | 'staging' | 'prod';

export type StageConfig = {
  stage: StageName;
  accountId: string;
  region: string;
  dbInstanceClass: string;
  dbAllocatedStorage: number;
  dbMultiAz: boolean;
  dbDeletionProtection: boolean;
  dbBackupRetention: number;
  apiMemorySize: number;
  apiTimeout: number;
  webhookProcessorMemorySize: number;
  webhookQueueVisibilityTimeout: number;
  webhookDlqMaxReceiveCount: number;
  domainName?: string;
  logRetentionDays: number;
};

export const stageConfigs: Record<StageName, StageConfig> = {
  dev: {
    stage: 'dev',
    accountId: '588738567629',
    region: 'us-east-1',
    dbInstanceClass: 'db.t4g.micro',
    dbAllocatedStorage: 20,
    dbMultiAz: false,
    dbDeletionProtection: false,
    dbBackupRetention: 1,
    apiMemorySize: 512,
    apiTimeout: 30,
    webhookProcessorMemorySize: 256,
    webhookQueueVisibilityTimeout: 60,
    webhookDlqMaxReceiveCount: 3,
    logRetentionDays: 7,
  },
  staging: {
    stage: 'staging',
    accountId: '471112515517',
    region: 'us-east-1',
    dbInstanceClass: 'db.t4g.small',
    dbAllocatedStorage: 50,
    dbMultiAz: false,
    dbDeletionProtection: true,
    dbBackupRetention: 7,
    apiMemorySize: 1024,
    apiTimeout: 30,
    webhookProcessorMemorySize: 512,
    webhookQueueVisibilityTimeout: 60,
    webhookDlqMaxReceiveCount: 3,
    logRetentionDays: 30,
  },
  prod: {
    stage: 'prod',
    accountId: '975050325894',
    region: 'us-east-1',
    dbInstanceClass: 'db.t4g.medium',
    dbAllocatedStorage: 100,
    dbMultiAz: true,
    dbDeletionProtection: true,
    dbBackupRetention: 30,
    apiMemorySize: 1024,
    apiTimeout: 30,
    webhookProcessorMemorySize: 512,
    webhookQueueVisibilityTimeout: 60,
    webhookDlqMaxReceiveCount: 3,
    logRetentionDays: 90,
  },
};

export function getStageConfig(stage: string): StageConfig {
  if (stage === 'dev' || stage === 'staging' || stage === 'prod') {
    return stageConfigs[stage];
  }

  throw new Error(`Invalid stage '${stage}'. Expected one of: dev, staging, prod.`);
}