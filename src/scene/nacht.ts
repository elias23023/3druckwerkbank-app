import { createContext } from 'react';
/** Is it night on the stage (the looks "blau" and "nacht")? Set by Stage, read by Island: the six main islands have a picture of
 *  their own for the night (insel-<name>-nacht, scripts/island-nacht.mjs) that lies exactly over the day picture. */
export const NachtContext = createContext(false);
