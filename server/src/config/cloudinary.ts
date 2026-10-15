import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface UploadCloudinaryOptions {
  folder: string;
  filename?: string;
  isPrivate?: boolean;
  resourceType?: 'auto' | 'raw' | 'image';
}

export const uploadToCloudinary = async (
  buffer: Buffer,
  folderOrOptions: string | UploadCloudinaryOptions,
  legacyFilename?: string
): Promise<{ url: string; publicId: string }> => {
  const options: UploadCloudinaryOptions =
    typeof folderOrOptions === 'string'
      ? { folder: folderOrOptions, filename: legacyFilename, isPrivate: false }
      : folderOrOptions;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `ayush_portal/${options.folder}`,
        public_id: options.filename ? `${options.filename}_${Date.now()}` : undefined,
        resource_type: options.resourceType || 'auto',
        type: options.isPrivate ? 'authenticated' : 'upload',
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error('Cloudinary upload failed'));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    uploadStream.end(buffer);
  });
};

export const ensureCloudinaryConfig = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
};

/**
 * Generates a time-limited signed URL for private/authenticated assets (resumes, private certificates).
 */
export const generateSignedDownloadUrl = (
  publicId: string,
  expiresInSeconds: number = 3600,
  resourceType: 'raw' | 'image' | 'video' = 'raw',
  format: string = ''
): string => {
  ensureCloudinaryConfig();
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return cloudinary.utils.private_download_url(publicId, format, {
    expires_at: expiresAt,
    resource_type: resourceType,
  });
};

export default cloudinary;
