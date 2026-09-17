import { careGridClinicalPillars, careGridExistingProgrammes, careGridMetrics, careGridPlatformModules, clinicalAlertSafetyBoundary, expandedRoles } from '../../../lib/platform-catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({
    name: 'CareGrid',
    clinicalPillars: careGridClinicalPillars,
    existingProgrammes: careGridExistingProgrammes,
    supportedMetricModel: careGridMetrics,
    modules: careGridPlatformModules,
    expandedRoles,
    clinicalAlertSafetyBoundary,
  });
}
