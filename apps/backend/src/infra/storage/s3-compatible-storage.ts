import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Storage } from "../../application/ports/storage";
import { loadStorageEnv } from "./env";

/**
 * Implementação real via SDK oficial da AWS — funciona com qualquer
 * provedor S3-compatible (AWS S3 hoje, Cloudflare R2 depois) trocando só
 * `STORAGE_ENDPOINT`/`STORAGE_FORCE_PATH_STYLE`.
 */
export function createS3CompatibleStorage(): Storage {
  let cachedClient: S3Client | null = null;
  let cachedBucket: string | null = null;

  function client(): { s3: S3Client; bucket: string } {
    if (!cachedClient) {
      const env = loadStorageEnv();
      cachedClient = new S3Client({
        region: env.STORAGE_REGION,
        credentials: {
          accessKeyId: env.STORAGE_ACCESS_KEY_ID,
          secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
        },
        endpoint: env.STORAGE_ENDPOINT,
        forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
      });
      cachedBucket = env.STORAGE_BUCKET;
    }
    return { s3: cachedClient, bucket: cachedBucket! };
  }

  return {
    async upload(key, body, contentType) {
      const { s3, bucket } = client();
      await s3.send(
        new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
      );
    },
    async getSignedReadUrl(key, ttlSeconds) {
      const { s3, bucket } = client();
      return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), {
        expiresIn: ttlSeconds,
      });
    },
    async delete(key) {
      const { s3, bucket } = client();
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}
