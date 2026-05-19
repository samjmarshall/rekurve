// Unit test env — skip T3 env validation so pure-function tests can import
// modules that transitively reference ~/env without needing real secrets.
process.env.SKIP_ENV_VALIDATION = "1";
