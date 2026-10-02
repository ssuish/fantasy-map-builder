import { errors } from '@strapi/utils';

interface UploadFile {
  mime?: string;
  filepath?: string;
}

interface UploadPlugin {
  services: {
    'image-manipulation': {
      isImage: (file: UploadFile) => Promise<boolean | undefined>;
    };
  };
}

export default (plugin: UploadPlugin) => {
  const imageService = plugin.services['image-manipulation'];
  const isImage = imageService.isImage.bind(imageService);

  imageService.isImage = async (file) => {
    const recognized = await isImage(file);
    // Upstream treats failed image detection as a non-image upload. Reject
    // declared images instead of allowing malformed bytes into the provider.
    if (!recognized && file.mime?.toLowerCase().startsWith('image/')) {
      throw new errors.ValidationError('File is not a valid supported image');
    }
    return recognized;
  };

  return plugin;
};
