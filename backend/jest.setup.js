// Jest setup — provide dummy credentials for tests
// that import services which require supabase at load time
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.dummy";
process.env.ELEVY_RATE = "0.015";
process.env.ELEVY_THRESHOLD = "100";
process.env.ELEVY_MIN = "0.10";
process.env.ELEVY_MAX = "100.00";
