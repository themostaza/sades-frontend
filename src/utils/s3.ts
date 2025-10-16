import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import config from '@/config/env';

// Inizializza il client S3
const s3Client = new S3Client({
  region: config.AWS_REGION,
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Genera un presigned URL per il caricamento di un file su S3
 * @param fileName Nome del file (con estensione)
 * @param fileType Tipo MIME del file (es: 'image/jpeg', 'application/pdf')
 * @param folder Cartella in cui salvare il file (es: 'images', 'documents')
 * @returns Oggetto con presignedUrl e fileUrl
 */
export async function generatePresignedUrl(
  fileName: string,
  fileType: string,
  folder: string = 'uploads'
) {
  console.log('========================================');
  console.log('☁️ [S3 Utils] Starting generatePresignedUrl');
  console.log('☁️ [S3 Utils] Input:', { fileName, fileType, folder });
  console.log('☁️ [S3 Utils] AWS Config:', {
    region: config.AWS_REGION,
    bucket: config.AWS_S3_BUCKET_NAME,
    hasAccessKey: !!config.AWS_ACCESS_KEY_ID,
    hasSecretKey: !!config.AWS_SECRET_ACCESS_KEY,
  });
  
  // Genera un nome file univoco usando timestamp
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `${folder}/${timestamp}_${sanitizedFileName}`;

  console.log('📝 [S3 Utils] Generated key:', key);

  try {
    const command = new PutObjectCommand({
      Bucket: config.AWS_S3_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    console.log('🔄 [S3 Utils] Getting signed URL...');
    
    // Genera presigned URL valido per 15 minuti
    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 900, // 15 minuti
    });

    console.log('✅ [S3 Utils] Signed URL generated successfully');

    // URL finale del file (dopo l'upload)
    const fileUrl = `https://${config.AWS_S3_BUCKET_NAME}.s3.${config.AWS_REGION}.amazonaws.com/${key}`;

    console.log('📝 [S3 Utils] Final file URL:', fileUrl);
    console.log('========================================');

    return {
      presignedUrl,
      fileUrl,
      key,
    };
  } catch (error) {
    console.error('💥 [S3 Utils] Error generating presigned URL:', error);
    console.error('💥 [S3 Utils] Error type:', error instanceof Error ? 'Error' : typeof error);
    console.error('💥 [S3 Utils] Error message:', error instanceof Error ? error.message : String(error));
    console.log('========================================');
    throw error;
  }
}

export { s3Client };

