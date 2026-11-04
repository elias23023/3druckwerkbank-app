import type { SheetKind } from '../store';
import { ProjektForm } from '../forms/ProjektForm';
import { SpuleForm } from '../forms/SpuleForm';
import { AbschliessenSheet, BerichtSheet, DruckSheet, GeraetSheet, NeuerDruckSheet, VersionSheet } from '../forms/Kleine';
import { EinstellungenSheet, UeberSheet } from './About';
import { ProjektDetailSheet } from '../forms/ProjektDetail';
import { HinweiseSheet } from './Hinweise';

export function SheetHost({ sheet }: { sheet: SheetKind }) {
  switch (sheet.kind) {
    case 'projektForm': return <ProjektForm key={sheet.projectId ?? 'neu'} projectId={sheet.projectId} />;
    case 'spule': return <SpuleForm key={sheet.spoolId ?? 'neu'} spoolId={sheet.spoolId} />;
    case 'geraet': return <GeraetSheet deviceId={sheet.deviceId} />;
    case 'druck': return <DruckSheet printId={sheet.printId} />;
    case 'bericht': return <BerichtSheet reportId={sheet.reportId} />;
    case 'neuerDruck': return <NeuerDruckSheet projectId={sheet.projectId} />;
    case 'version': return <VersionSheet projectId={sheet.projectId} versionId={sheet.versionId} />;
    case 'abschliessen': return <AbschliessenSheet projectId={sheet.projectId} />;
    case 'einstellungen': return <EinstellungenSheet />;
    case 'ueber': return <UeberSheet />;
    case 'projektDetail': return <ProjektDetailSheet key={sheet.projectId + sheet.tab} projectId={sheet.projectId} tab={sheet.tab} />;
    case 'hinweise': return <HinweiseSheet />;
  }
}
