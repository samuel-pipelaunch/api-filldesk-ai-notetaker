type SchedulerEvent = {
  action?: 'start' | 'stop';
};

type DbStatus =
  | 'available'
  | 'stopped'
  | 'stopping'
  | 'starting'
  | 'backing-up'
  | 'modifying'
  | 'rebooting'
  | string;

interface RdsDbInstance {
  DBInstanceStatus?: DbStatus;
}

interface RdsClient {
  send(command: unknown): Promise<{ DBInstances?: RdsDbInstance[] }>;
}

function resolveDbIdentifier(): string {
  const value = process.env.DB_INSTANCE_IDENTIFIER;
  if (!value) {
    throw new Error('DB_INSTANCE_IDENTIFIER is required');
  }

  return value;
}

async function createClient(): Promise<{
  client: RdsClient;
  DescribeDBInstancesCommand: new (input: { DBInstanceIdentifier: string }) => unknown;
  StartDBInstanceCommand: new (input: { DBInstanceIdentifier: string }) => unknown;
  StopDBInstanceCommand: new (input: { DBInstanceIdentifier: string }) => unknown;
}> {
  const sdk = (await import('@aws-sdk/client-rds')) as {
    RDSClient: new (input: { region?: string }) => RdsClient;
    DescribeDBInstancesCommand: new (input: { DBInstanceIdentifier: string }) => unknown;
    StartDBInstanceCommand: new (input: { DBInstanceIdentifier: string }) => unknown;
    StopDBInstanceCommand: new (input: { DBInstanceIdentifier: string }) => unknown;
  };

  return {
    client: new sdk.RDSClient({ region: process.env.AWS_REGION }),
    DescribeDBInstancesCommand: sdk.DescribeDBInstancesCommand,
    StartDBInstanceCommand: sdk.StartDBInstanceCommand,
    StopDBInstanceCommand: sdk.StopDBInstanceCommand,
  };
}

export async function handler(event: SchedulerEvent): Promise<{ ok: true }> {
  const dbInstanceIdentifier = resolveDbIdentifier();
  const action = event.action ?? 'stop';

  const { client, DescribeDBInstancesCommand, StartDBInstanceCommand, StopDBInstanceCommand } =
    await createClient();

  const describeResult = await client.send(
    new DescribeDBInstancesCommand({ DBInstanceIdentifier: dbInstanceIdentifier }),
  );

  const dbStatus = describeResult.DBInstances?.[0]?.DBInstanceStatus;

  if (action === 'stop') {
    if (dbStatus === 'available') {
      await client.send(new StopDBInstanceCommand({ DBInstanceIdentifier: dbInstanceIdentifier }));
      console.log(`Requested stop for DB instance '${dbInstanceIdentifier}'`);
    } else {
      console.log(
        `Skipping stop for DB instance '${dbInstanceIdentifier}', current status is '${dbStatus ?? 'unknown'}'`,
      );
    }

    return { ok: true };
  }

  if (dbStatus === 'stopped') {
    await client.send(new StartDBInstanceCommand({ DBInstanceIdentifier: dbInstanceIdentifier }));
    console.log(`Requested start for DB instance '${dbInstanceIdentifier}'`);
  } else {
    console.log(
      `Skipping start for DB instance '${dbInstanceIdentifier}', current status is '${dbStatus ?? 'unknown'}'`,
    );
  }

  return { ok: true };
}
