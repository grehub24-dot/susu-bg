const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

const decodeBase64UrlJson = (input) => {
  const normalized = String(input)
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(String(input).length / 4) * 4, "=");

  const json = Buffer.from(normalized, "base64").toString("utf8");
  return JSON.parse(json);
};

const assertServiceRoleKey = (key) => {
  const parts = String(key || "").split(".");
  if (parts.length < 2) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not a valid JWT. Make sure you pasted the Service Role key from Supabase Project Settings."
    );
  }

  const payload = decodeBase64UrlJson(parts[1]);
  const role = payload?.role;
  if (role !== "service_role") {
    process.stdout.write(
      `Supabase key rejected. prefix=${String(key || "").slice(0, 3)} len=${String(key || "").length} role=${String(role)}\n`
    );
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY does not have service_role privileges (detected role: ${String(role)}). Using an anon key will trigger RLS errors.`
    );
  }
};

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
}

assertServiceRoleKey(supabaseServiceRoleKey);

try {
  const payload = decodeBase64UrlJson(String(supabaseServiceRoleKey).split(".")[1]);
  const role = payload?.role;
  process.stdout.write(`Supabase key role detected: ${String(role)}\n`);
} catch (error) {
  process.stdout.write("Supabase key role detected: <decode_failed>\n");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

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
