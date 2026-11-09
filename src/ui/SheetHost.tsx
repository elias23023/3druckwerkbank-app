import type { SheetKind } from '../store';
import { ProjektForm } from '../forms/ProjektForm';
import { SpuleForm } from '../forms/SpuleForm';
import { AbschliessenSheet, BerichtSheet, DruckSheet, GeraetSheet, NeuerDruckSheet, VersionSheet } from '../forms/Kleine';
import { GeraetForm, GeraeteSheet } from '../forms/GeraetForm';
import { EinstellungenSheet, UeberSheet } from './About';
import { ProjektDetailSheet } from '../forms/ProjektDetail';
import { HinweiseSheet } from './Hinweise';
import { KontoSheet } from './Konto';
import { BereichSheet } from './Bereich';

export function SheetHost({ sheet }: { sheet: SheetKind }) {
  switch (sheet.kind) {
    case 'projektForm': return <ProjektForm key={sheet.projectId ?? 'neu'} projectId={sheet.projectId} />;
    case 'spule': return <SpuleForm key={sheet.spoolId ?? 'neu'} spoolId={sheet.spoolId} />;
    case 'geraet': return <GeraetSheet key={sheet.deviceId} deviceId={sheet.deviceId} />;
    case 'geraetForm': return <GeraetForm key={(sheet.deviceId ?? 'neu') + (sheet.deviceKind ?? '')} deviceId={sheet.deviceId} deviceKind={sheet.deviceKind} projectId={sheet.projectId} returnTo={sheet.returnTo} />;
    case 'geraete': return <GeraeteSheet key={sheet.tab ?? 'geraete'} tab={sheet.tab} />;
    case 'druck': return <DruckSheet key={sheet.printId} printId={sheet.printId} />;
    case 'bericht': return <BerichtSheet reportId={sheet.reportId} />;
    case 'neuerDruck': return <NeuerDruckSheet key={sheet.projectId} projectId={sheet.projectId} />;
    case 'version': return <VersionSheet projectId={sheet.projectId} versionId={sheet.versionId} />;
    case 'abschliessen': return <AbschliessenSheet projectId={sheet.projectId} />;
    case 'einstellungen': return <EinstellungenSheet />;
    case 'ueber': return <UeberSheet />;
    case 'projektDetail': return <ProjektDetailSheet key={sheet.projectId + sheet.tab} projectId={sheet.projectId} tab={sheet.tab} />;
    case 'hinweise': return <HinweiseSheet />;
    case 'konto': return <KontoSheet resetToken={sheet.resetToken} />;
    case 'bereich': return <BereichSheet />;
  }
}
