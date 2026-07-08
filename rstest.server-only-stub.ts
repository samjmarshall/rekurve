// No-op stand-in for the `server-only` marker package in Rstest.
//
// `server-only`'s default entry throws at import time; its no-op entry is only
// selected under the `react-server` export condition. Setting that condition
// bundle-wide (resolve.conditionNames) breaks client-component tests: `react`
// then resolves to its react-server build, which has no createContext /
// useLayoutEffect. Aliasing just `server-only` to this stub keeps the full
// React build for client tests while letting server modules import freely.
export {};
