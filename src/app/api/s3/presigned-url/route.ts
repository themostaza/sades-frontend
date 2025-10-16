import { NextRequest, NextResponse } from 'next/server';
import { generatePresignedUrl } from '@/utils/s3';

export async function POST(request: NextRequest) {
  console.log('========================================');
  console.log('📸 [S3 Presigned URL API] Starting POST request');
  console.log('========================================');
  
  try {
    const body = await request.json();
    const { fileName, fileType, folder } = body;

    console.log('📝 [S3 Presigned URL API] Request body:', {
      fileName,
      fileType,
      folder
    });

    if (!fileName || !fileType) {
      console.error('❌ [S3 Presigned URL API] Missing required fields');
      return NextResponse.json(
        { error: 'fileName e fileType sono obbligatori' },
        { status: 400 }
      );
    }

    console.log('🔄 [S3 Presigned URL API] Generating presigned URL...');
    
    // Genera presigned URL
    const result = await generatePresignedUrl(fileName, fileType, folder || 'uploads');

    console.log('✅ [S3 Presigned URL API] Presigned URL generated successfully');
    console.log('📝 [S3 Presigned URL API] Result:', {
      fileUrl: result.fileUrl,
      hasPresignedUrl: !!result.presignedUrl
    });
    console.log('========================================');

    return NextResponse.json(result);
  } catch (error) {
    console.error('💥 [S3 Presigned URL API] Error:', error);
    console.error('💥 [S3 Presigned URL API] Error type:', error instanceof Error ? 'Error' : typeof error);
    console.error('💥 [S3 Presigned URL API] Error message:', error instanceof Error ? error.message : String(error));
    console.error('💥 [S3 Presigned URL API] Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.log('========================================');
    
    return NextResponse.json(
      { error: 'Errore durante la generazione del presigned URL', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

