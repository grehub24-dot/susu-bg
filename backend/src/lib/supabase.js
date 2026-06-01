const { createClient } = require("@supabase/supabase-js");

const decodeBase64UrlJson = (input) => {
  const normalized = String(input)
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(String(input).length / 4) * 4, "=");

  const json = Buffer.from(normalized, "base64").toString("utf8");
  return JSON.parse(json);
};

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

let supabase;

if (supabaseUrl && supabaseServiceRoleKey) {
  try {
    // Log the detected role for debugging
    const parts = supabaseServiceRoleKey.split(".");
    if (parts.length >= 2) {
      const payload = decodeBase64UrlJson(parts[1]);
      console.warn(`[supabase] Key role detected: ${String(payload?.role)}`);
    }
  } catch {
    console.warn("[supabase] Could not decode key role (non-critical)");
  }

  supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
} else {
  console.warn(
    "[supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. " +
    "Database features will fail at query time. Set both env vars to enable."
  );
  // Create a minimal client that will fail gracefully at query time
  supabase = createClient(
    supabaseUrl || "https://placeholder.supabase.co",
    supabaseServiceRoleKey || "placeholder",
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

const ensuredBuckets = new Set();

supabase.ensureBucketExists = async (bucketName, options = { public: true }) => {
  if (!bucketName) throw new Error("Bucket name is required");
  if (ensuredBuckets.has(bucketName)) return;

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    throw new Error(listError.message);
  }

  const exists = Array.isArray(buckets) && buckets.some((bucket) => bucket?.name === bucketName);
  if (!exists) {
    const { error: createError } = await supabase.storage.createBucket(bucketName, options);
    if (createError) {
      throw new Error(createError.message);
    }
  }

  ensuredBuckets.add(bucketName);
};

module.exports = supabase;
