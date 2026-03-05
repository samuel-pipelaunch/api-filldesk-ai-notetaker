export { googleCalendarConnections } from './google-calendar-connections.js';
export { licenses } from './licenses.js';
export { meetings } from './meetings.js';
export { organizationSettings } from './organization-settings.js';
export { organizations } from './organizations.js';
export { transcriptSegments } from './transcript-segments.js';
export { userSettings } from './user-settings.js';
export { users } from './users.js';
export { webhookEvents } from './webhook-events.js';

import { googleCalendarConnections } from './google-calendar-connections.js';
import { licenses } from './licenses.js';
import { meetings } from './meetings.js';
import { organizationSettings } from './organization-settings.js';
import { organizations } from './organizations.js';
import { transcriptSegments } from './transcript-segments.js';
import { userSettings } from './user-settings.js';
import { users } from './users.js';
import { webhookEvents } from './webhook-events.js';

export const schema = {
  organizations,
  users,
  licenses,
  organizationSettings,
  userSettings,
  googleCalendarConnections,
  meetings,
  webhookEvents,
  transcriptSegments,
};
