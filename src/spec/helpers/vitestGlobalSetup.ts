import { cleanupStaleSpecTempDirs } from './tempProject';

export default function setup() {
    cleanupStaleSpecTempDirs();

    return () => {
        cleanupStaleSpecTempDirs();
    };
}
