import { liveClinicalPillars, programmesByPillar } from './server/clinical.ts';

export const careGridClinicalPillars = liveClinicalPillars;
export const careGridExistingProgrammes = Object.values(programmesByPillar).flat();

export const careGridMetrics = [
  'blood-pressure','blood-glucose','continuous-glucose','weight','spo2','pulse','temperature','spirometry','ecg','medication-adherence','activity-adherence'
] as const;

export const careGridPlatformModules = [
  { key: 'rpm', name: 'Remote Patient Monitoring', group: 'Clinical monitoring' },
  { key: 'devices', name: 'Connected Device Management', group: 'Clinical monitoring' },
  { key: 'people', name: 'Unified Person Record', group: 'Care delivery' },
  { key: 'care-plans', name: 'Care Plans', group: 'Care delivery' },
  { key: 'care-workspace', name: 'Care-Team Workspace', group: 'Care delivery' },
  { key: 'population', name: 'Population Management', group: 'Care delivery' },
  { key: 'trends', name: 'Longitudinal Trends', group: 'Clinical monitoring' },
  { key: 'attention', name: 'Operational Attention', group: 'Operations' },
  { key: 'clinical-alerts', name: 'Governed Clinical Alerts', group: 'Clinical monitoring' },
  { key: 'engagement', name: 'Patient Engagement', group: 'Engagement' },
  { key: 'communications', name: 'Communications Hub', group: 'Engagement' },
  { key: 'tasks', name: 'Tasks & Care Coordination', group: 'Care delivery' },
  { key: 'time', name: 'Care Management Time', group: 'Operations' },
  { key: 'billing', name: 'Billing & Financial Workflow', group: 'Finance' },
  { key: 'enrolment', name: 'Consent, Eligibility & Enrollment', group: 'Operations' },
  { key: 'rtm', name: 'Remote Therapeutic Monitoring', group: 'Clinical monitoring' },
  { key: 'assessments', name: 'Questionnaires & Assessments', group: 'Care delivery' },
  { key: 'analytics', name: 'Analytics & Reporting', group: 'Analytics' },
  { key: 'roi', name: 'Financial & ROI Analytics', group: 'Finance' },
  { key: 'quality', name: 'Quality Reporting', group: 'Analytics' },
  { key: 'enterprise', name: 'Multi-Site & Multi-Provider', group: 'Enterprise' },
  { key: 'ehr', name: 'EHR / EMR Integration', group: 'Integrations' },
  { key: 'api', name: 'API & Integration Platform', group: 'Integrations' },
  { key: 'rbac', name: 'Role-Based Access Control', group: 'Security' },
  { key: 'security', name: 'Security & Compliance', group: 'Security' },
  { key: 'managed-care', name: 'Managed Care Services', group: 'Operations' },
  { key: 'logistics', name: 'Device Logistics & Support', group: 'Operations' },
  { key: 'patient-portal', name: 'Patient Portal', group: 'Engagement' },
  { key: 'search', name: 'Universal Search', group: 'Platform' },
  { key: 'automation', name: 'Workflow Automation', group: 'Platform' },
] as const;

export const expandedRoles = [
  'platform-admin','organisation-admin','clinical-admin','physician','nurse','care-manager','reviewer','device-technician','billing','analyst','auditor'
] as const;

export const clinicalAlertSafetyBoundary = {
  defaultEnabled: false,
  requiresGovernanceReference: true,
  statement: 'Clinical measurement alerting must use an explicitly approved, versioned rule and response workflow. CareGrid does not invent diagnostic or treatment thresholds.',
} as const;
