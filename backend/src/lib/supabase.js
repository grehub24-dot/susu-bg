const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
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
