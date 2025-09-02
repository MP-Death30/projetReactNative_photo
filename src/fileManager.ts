import * as FileSystem from 'expo-file-system';

/**
 * Sauvegarde une image dans le dossier persistant de l'app
 * @param uri URI temporaire (camera/image picker)
 * @returns chemin persistant ou null
 */
export const saveImageToLocal = async (uri: string): Promise<string | null> => {
  try {
    const fileName = `photo_${Date.now()}.jpg`;
    const destPath = FileSystem.documentDirectory + fileName;
    await FileSystem.copyAsync({ from: uri, to: destPath });
    return destPath;
  } catch (error) {
    console.error("Erreur lors de la sauvegarde de l'image :", error);
    return null;
  }
};

/**
 * Supprime une image persistante
 * @param path chemin du fichier
 */
export const deleteImageFromLocal = async (path: string): Promise<void> => {
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      await FileSystem.deleteAsync(path);
    }
  } catch (error) {
    console.error("Erreur lors de la suppression de l'image :", error);
  }
};
