import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid'; // Necesitaremos 'uuid' para nombres únicos
import { storage } from '../firebase'; // Importa la instancia de storage de tu archivo principal

/**
 * Sube un archivo (imagen) a Firebase Storage y devuelve la URL pública.
 * @param file El archivo a subir (File object).
 * @param path La carpeta dentro de Storage (ej. 'properties' o 'testimonials').
 * @returns Promise<string> La URL pública de la imagen subida.
 */
export const uploadImageToStorage = async (file: File, path: string): Promise<string> => {
  if (!file) {
    throw new Error("No se proporcionó ningún archivo para subir.");
  }

  // 1. Generar un nombre de archivo único para evitar sobreescrituras
  const fileExtension = file.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExtension}`;
  
  // 2. Crear la referencia en Firebase Storage
  const storageRef = ref(storage, `${path}/${fileName}`);

  try {
    // 3. Subir el archivo
    const snapshot = await uploadBytes(storageRef, file);
    
    // 4. Obtener la URL de descarga pública
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error("Error al subir la imagen:", error);
    throw new Error("No se pudo subir la imagen a Firebase Storage.");
  }
};