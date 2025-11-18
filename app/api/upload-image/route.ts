
import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Initialize S3 client
const s3Client = new S3Client({})

// Get bucket configuration from environment
const bucketName = process.env.AWS_BUCKET_NAME
const folderPrefix = process.env.AWS_FOLDER_PREFIX || ''

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const purpose = formData.get('purpose') as string || 'other'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 15)
    const ext = file.name.split('.').pop()
    const fileName = `${purpose}-${timestamp}-${randomStr}.${ext}`
    const s3Key = `${folderPrefix}website-images/${fileName}`

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: buffer,
      ContentType: file.type,
    })

    await s3Client.send(command)

    // Generate signed URL for accessing the image (valid for 7 days)
    const getCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
    })
    
    const signedUrl = await getSignedUrl(s3Client, getCommand, {
      expiresIn: 7 * 24 * 60 * 60, // 7 days
    })

    // Return the public URL
    const publicUrl = `https://${bucketName}.s3.amazonaws.com/${s3Key}`

    return NextResponse.json({
      success: true,
      url: signedUrl, // Use signed URL for temporary access
      cloudPath: s3Key,
      purpose: purpose,
    })
  } catch (error) {
    console.error('Error uploading image:', error)
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}
