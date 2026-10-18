// Local build fallback only. The Pages workflow installs the licensed package
// before Vite runs, so this module is not included in the deployed build.
export class SkyWayNoiseCanceller {
  constructor() {
    throw new Error("SkyWay AI Noise Canceller is not installed in this build.");
  }
}
