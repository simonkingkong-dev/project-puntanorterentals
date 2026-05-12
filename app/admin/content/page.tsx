"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  HelpCircle,
  Home,
  Info,
  Save,
  ScrollText,
  ShieldCheck,
  Sparkles,
  X,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSiteContentForAdmin, updateSiteContentAdmin } from './actions';
import { uploadImageToStorage } from '@/lib/firebase/storage';

interface ContentSection {
  section: string;
  title: string;
  icon: LucideIcon;
  fields: {
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'image' | 'imageGallery' | 'url';
    placeholder?: string;
  }[];
}

const contentSections: ContentSection[] = [
  {
    section: 'homepage',
    title: 'Página de Inicio',
    icon: Home,
    fields: [
      {
        key: 'hero_title',
        label: 'Título Principal',
        type: 'text',
        placeholder: 'Descubre Tu Escape Perfecto'
      },
      {
        key: 'hero_subtitle',
        label: 'Subtítulo',
        type: 'textarea',
        placeholder: 'Propiedades vacacionales excepcionales en los destinos más hermosos...'
      },
      {
        key: 'hero_cover_images',
        label: 'Imágenes de portada (rotación)',
        type: 'imageGallery',
        placeholder: 'Una URL por línea'
      },
      {
        key: 'featured_properties_title',
        label: 'Título Propiedades Destacadas',
        type: 'text',
        placeholder: 'Propiedades Destacadas'
      },
      {
        key: 'featured_properties_subtitle',
        label: 'Subtítulo Propiedades Destacadas',
        type: 'textarea',
        placeholder: 'Selecciona entre nuestras propiedades más populares...'
      },
      {
        key: 'features_title',
        label: 'Título Sección Características',
        type: 'text',
        placeholder: '¿Por Qué Elegir Casa Alkimia?'
      },
      {
        key: 'features_subtitle',
        label: 'Subtítulo Sección Características',
        type: 'textarea',
        placeholder: 'Nos dedicamos a crear experiencias excepcionales...'
      },
      {
        key: 'testimonials_title',
        label: 'Título Testimonios',
        type: 'text',
        placeholder: 'Lo Que Dicen Nuestros Huéspedes'
      },
      {
        key: 'cta_title',
        label: 'Título Call to Action',
        type: 'text',
        placeholder: '¿Listo Para Tu Próxima Aventura?'
      },
      {
        key: 'cta_subtitle',
        label: 'Subtítulo Call to Action',
        type: 'textarea',
        placeholder: 'Descubre propiedades increíbles y comienza a planificar...'
      }
    ]
  },
  {
    section: 'about',
    title: 'Acerca de Nosotros',
    icon: Info,
    fields: [
      {
        key: 'about_title',
        label: 'Título Principal',
        type: 'text',
        placeholder: 'Nuestra Historia'
      },
      {
        key: 'page_about_title',
        label: 'Título página About',
        type: 'text',
        placeholder: 'Acerca de nosotros'
      },
      {
        key: 'page_about_meta',
        label: 'Meta descripción página About',
        type: 'textarea',
        placeholder: 'Descripción SEO de la página About.'
      },
      {
        key: 'about_description',
        label: 'Descripción',
        type: 'textarea',
        placeholder: 'Somos una empresa dedicada a...'
      },
      {
        key: 'mission_title',
        label: 'Título Misión',
        type: 'text',
        placeholder: 'Nuestra Misión'
      },
      {
        key: 'mission_description',
        label: 'Descripción Misión',
        type: 'textarea',
        placeholder: 'Crear experiencias vacacionales excepcionales...'
      },
      {
        key: 'vision_title',
        label: 'Título Visión',
        type: 'text',
        placeholder: 'Nuestra Visión'
      },
      {
        key: 'vision_description',
        label: 'Descripción Visión',
        type: 'textarea',
        placeholder: 'Ser la plataforma líder en...'
      },
      {
        key: 'page_about_lead',
        label: 'Lead página About',
        type: 'textarea',
        placeholder: 'Texto introductorio destacado de la página About.'
      },
      {
        key: 'page_about_body',
        label: 'Contenido página About',
        type: 'textarea',
        placeholder: 'Contenido principal de la página About.'
      }
    ]
  },
  {
    section: 'help',
    title: 'Página de Ayuda',
    icon: HelpCircle,
    fields: [
      { key: 'page_help_title', label: 'Título', type: 'text', placeholder: 'Centro de Ayuda' },
      { key: 'page_help_meta', label: 'Meta descripción', type: 'textarea', placeholder: 'Descripción SEO de la página de ayuda.' },
      { key: 'page_help_intro', label: 'Introducción', type: 'textarea', placeholder: 'Texto introductorio de ayuda.' },
      { key: 'page_help_how_book_title', label: 'Título: Cómo reservar', type: 'text', placeholder: '¿Cómo reservar?' },
      { key: 'page_help_how_book', label: 'Texto: Cómo reservar', type: 'textarea', placeholder: 'Explicación del proceso de reserva.' },
      { key: 'page_help_how_cancel_title', label: 'Título: Cómo cancelar', type: 'text', placeholder: '¿Cómo cancelar o modificar?' },
      { key: 'page_help_how_cancel', label: 'Texto: Cómo cancelar', type: 'textarea', placeholder: 'Explicación de cancelación o modificación.' },
      { key: 'page_help_link_cancellation', label: 'Texto link a cancelación', type: 'text', placeholder: 'Ver políticas de cancelación' }
    ]
  },
  {
    section: 'terms',
    title: 'Términos y Condiciones',
    icon: ScrollText,
    fields: [
      { key: 'page_terms_title', label: 'Título', type: 'text', placeholder: 'Términos de uso' },
      { key: 'page_terms_meta', label: 'Meta descripción', type: 'textarea', placeholder: 'Descripción SEO de términos.' },
      { key: 'page_terms_updated', label: 'Texto de actualización', type: 'text', placeholder: 'Última actualización: ...' },
      { key: 'page_terms_p1', label: 'Párrafo 1', type: 'textarea', placeholder: 'Primer párrafo de términos.' },
      { key: 'page_terms_p2', label: 'Párrafo 2', type: 'textarea', placeholder: 'Segundo párrafo de términos.' }
    ]
  },
  {
    section: 'privacy',
    title: 'Política de Privacidad',
    icon: ShieldCheck,
    fields: [
      { key: 'page_privacy_title', label: 'Título', type: 'text', placeholder: 'Política de privacidad' },
      { key: 'page_privacy_meta', label: 'Meta descripción', type: 'textarea', placeholder: 'Descripción SEO de privacidad.' },
      { key: 'page_privacy_updated', label: 'Texto de actualización', type: 'text', placeholder: 'Última actualización: ...' },
      { key: 'page_privacy_p1', label: 'Párrafo 1', type: 'textarea', placeholder: 'Primer párrafo de privacidad.' },
      { key: 'page_privacy_p2', label: 'Párrafo 2', type: 'textarea', placeholder: 'Segundo párrafo de privacidad.' }
    ]
  },
  {
    section: 'cancellation',
    title: 'Política de Cancelación',
    icon: FileText,
    fields: [
      { key: 'page_cancellation_title', label: 'Título', type: 'text', placeholder: 'Políticas de cancelación' },
      { key: 'page_cancellation_meta', label: 'Meta descripción', type: 'textarea', placeholder: 'Descripción SEO de cancelación.' },
      { key: 'page_cancellation_updated', label: 'Texto de actualización', type: 'text', placeholder: 'Última actualización: ...' },
      { key: 'page_cancellation_p1', label: 'Párrafo 1', type: 'textarea', placeholder: 'Primer párrafo de cancelación.' },
      { key: 'page_cancellation_p2', label: 'Párrafo 2', type: 'textarea', placeholder: 'Segundo párrafo de cancelación.' }
    ]
  },
  {
    section: 'services_page',
    title: 'Página de Servicios',
    icon: Sparkles,
    fields: [
      { key: 'page_services_title', label: 'Título', type: 'text', placeholder: 'Servicios' },
      { key: 'page_services_meta', label: 'Subtítulo/Meta', type: 'textarea', placeholder: 'Describe los servicios disponibles.' },
      { key: 'page_services_intro', label: 'Texto en estado vacío', type: 'textarea', placeholder: 'Texto cuando no hay servicios cargados.' },
      { key: 'services_more_title', label: 'Título sección secundaria', type: 'text', placeholder: 'Más experiencias' }
    ]
  },
  {
    section: 'properties_page',
    title: 'Página de Propiedades',
    icon: Home,
    fields: [
      { key: 'properties_title_all', label: 'Título (sin filtros)', type: 'text', placeholder: 'Todas las propiedades' },
      { key: 'properties_subtitle_all', label: 'Subtítulo (sin filtros)', type: 'textarea', placeholder: 'Explora nuestra colección de propiedades.' },
      { key: 'properties_title_results', label: 'Título (con filtros)', type: 'text', placeholder: 'Resultados de búsqueda' },
      { key: 'properties_subtitle_results', label: 'Subtítulo (con filtros)', type: 'textarea', placeholder: 'Propiedades que coinciden con tu búsqueda.' }
    ]
  }
];

/**
 * Displays and manages the admin content page for static website content.
 * @example
 * AdminContentPage()
 * Renders the admin content management interface.
 * @returns {JSX.Element} The rendered admin content management page component.
 */
export default function AdminContentPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImageKey, setUploadingImageKey] = useState<string | null>(null);
  const [draggingImageIndex, setDraggingImageIndex] = useState<number | null>(null);
  const [contentData, setContentData] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadContent();
  }, []);

  /**
   * Fetches and organizes site content into a key-value map.
   * @example
   * sync()
   * undefined
   * @param {void} No parameters are required.
   * @returns {void} Does not return a value but manages site content state and handles potential errors.
   */
  const loadContent = async () => {
    try {
      const content = await getSiteContentForAdmin();
      const contentMap: { [key: string]: string } = {};
      
      content.forEach(item => {
        const key = `${item.section}_${item.key}`;
        contentMap[key] = item.value;
      });
      
      setContentData(contentMap);
    } catch (error) {
      toast.error('Error cargando contenido');
    }
  };

  const handleInputChange = (section: string, key: string, value: string) => {
    const fullKey = `${section}_${key}`;
    setContentData(prev => ({
      ...prev,
      [fullKey]: value
    }));
  };

  const handleImageUpload = async (section: string, key: string, file: File) => {
    const fullKey = `${section}_${key}`;
    try {
      setUploadingImageKey(fullKey);
      const imageUrl = await uploadImageToStorage(file, 'site-content');
      handleInputChange(section, key, imageUrl);
      toast.success('Imagen cargada. Recuerda guardar los cambios.');
    } catch (error) {
      toast.error('No se pudo subir la imagen');
    } finally {
      setUploadingImageKey(null);
    }
  };

  const parseImageList = (value: string): string[] => {
    return value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const serializeImageList = (images: string[]): string => images.join('\n');

  const addImagesToGallery = async (section: string, key: string, files: File[]) => {
    const fullKey = `${section}_${key}`;
    try {
      setUploadingImageKey(fullKey);
      const uploadedUrls = await Promise.all(
        files.map((file) => uploadImageToStorage(file, 'site-content'))
      );

      const current = parseImageList(contentData[fullKey] || '');
      const merged = [...current, ...uploadedUrls];
      handleInputChange(section, key, serializeImageList(merged));
      toast.success('Imágenes cargadas. Recuerda guardar los cambios.');
    } catch (error) {
      toast.error('No se pudieron subir las imágenes');
    } finally {
      setUploadingImageKey(null);
    }
  };

  const removeImageFromGallery = (section: string, key: string, urlToRemove: string) => {
    const fullKey = `${section}_${key}`;
    const current = parseImageList(contentData[fullKey] || '');
    const updated = current.filter((url) => url !== urlToRemove);
    handleInputChange(section, key, serializeImageList(updated));
  };

  const reorderGalleryImages = (section: string, key: string, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const fullKey = `${section}_${key}`;
    const current = parseImageList(contentData[fullKey] || '');
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= current.length ||
      toIndex >= current.length
    ) {
      return;
    }

    const updated = [...current];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    handleInputChange(section, key, serializeImageList(updated));
  };

  /**
   * Synchronizes the content of a specified section with the existing site content.
   * @example
   * sync('header')
   * // No return value but updates site content and displays a success or error message through toast notifications.
   * @param {string} section - The section of the site content to be synchronized.
   * @returns {void} No return value, the function performs asynchronous updates on the site content.
   **/
  const handleSaveSection = async (section: string) => {
    setIsLoading(true);
    try {
      const sectionConfig = contentSections.find(s => s.section === section);
      if (!sectionConfig) return;

      const results = await Promise.all(
        sectionConfig.fields.map(field => {
          const fullKey = `${section}_${field.key}`;
          const value = contentData[fullKey] || '';
          return updateSiteContentAdmin(section, field.key, value, field.type);
        })
      );

      const failed = results.find(r => !r.success);
      if (failed) {
        toast.error(failed.error ?? 'Error guardando contenido');
      } else {
        toast.success('Contenido guardado exitosamente');
      }
    } catch (error) {
      toast.error('Error guardando contenido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Contenidos</h1>
          <p className="text-gray-600">Administra todo el contenido estático del sitio web</p>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="homepage" className="space-y-6">
          <TabsList className="flex h-auto w-full flex-wrap gap-2 bg-transparent p-0">
            {contentSections.map((section) => (
              <TabsTrigger
                key={section.section}
                value={section.section}
                className="flex items-center gap-2 border bg-white data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <section.icon className="w-4 h-4" />
                {section.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {contentSections.map((section) => (
            <TabsContent key={section.section} value={section.section}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <section.icon className="w-5 h-5" />
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6">
                    {section.fields.map((field) => {
                      const fullKey = `${section.section}_${field.key}`;
                      const value = contentData[fullKey] || '';

                      return (
                        <div key={field.key} className="space-y-2">
                          <Label htmlFor={fullKey}>{field.label}</Label>
                          {field.type === 'textarea' ? (
                            <Textarea
                              id={fullKey}
                              value={value}
                              onChange={(e) => handleInputChange(section.section, field.key, e.target.value)}
                              placeholder={field.placeholder}
                              rows={4}
                            />
                          ) : field.type === 'image' ? (
                            <div className="space-y-3">
                              {value && (
                                <div className="overflow-hidden rounded-md border bg-muted/20">
                                  {/* eslint-disable-next-line @next/next/no-img-element -- Preview de imagen CMS */}
                                  <img
                                    src={value}
                                    alt={field.label}
                                    className="h-48 w-full object-cover"
                                  />
                                </div>
                              )}
                              <Input
                                id={fullKey}
                                type="url"
                                value={value}
                                onChange={(e) => handleInputChange(section.section, field.key, e.target.value)}
                                placeholder={field.placeholder}
                              />
                              <Input
                                type="file"
                                accept="image/*"
                                disabled={uploadingImageKey === fullKey}
                                onChange={(e) => {
                                  const selectedFile = e.target.files?.[0];
                                  if (selectedFile) {
                                    void handleImageUpload(section.section, field.key, selectedFile);
                                  }
                                }}
                              />
                            </div>
                          ) : field.type === 'imageGallery' ? (
                            <div className="space-y-3">
                              {parseImageList(value).length > 0 && (
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                  {parseImageList(value).map((imageUrl, index) => (
                                    <div
                                      key={`${imageUrl}-${index}`}
                                      className={`relative overflow-hidden rounded-md border bg-muted/20 ${
                                        draggingImageIndex === index ? "ring-2 ring-primary" : ""
                                      }`}
                                      draggable
                                      onDragStart={() => setDraggingImageIndex(index)}
                                      onDragOver={(e) => e.preventDefault()}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        if (draggingImageIndex !== null) {
                                          reorderGalleryImages(
                                            section.section,
                                            field.key,
                                            draggingImageIndex,
                                            index
                                          );
                                        }
                                        setDraggingImageIndex(null);
                                      }}
                                      onDragEnd={() => setDraggingImageIndex(null)}
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element -- Preview de galería CMS */}
                                      <img
                                        src={imageUrl}
                                        alt="Imagen de portada"
                                        className="h-28 w-full object-cover"
                                      />
                                      <div className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                                        {index + 1}
                                      </div>
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute right-1 top-1 h-6 w-6"
                                        onClick={() =>
                                          removeImageFromGallery(section.section, field.key, imageUrl)
                                        }
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <Textarea
                                id={fullKey}
                                value={value}
                                onChange={(e) => handleInputChange(section.section, field.key, e.target.value)}
                                placeholder={field.placeholder}
                                rows={4}
                              />
                              <Input
                                type="file"
                                accept="image/*"
                                multiple
                                disabled={uploadingImageKey === fullKey}
                                onChange={(e) => {
                                  const selectedFiles = Array.from(e.target.files || []);
                                  if (selectedFiles.length > 0) {
                                    void addImagesToGallery(section.section, field.key, selectedFiles);
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <Input
                              id={fullKey}
                              type={field.type === 'url' ? 'url' : 'text'}
                              value={value}
                              onChange={(e) => handleInputChange(section.section, field.key, e.target.value)}
                              placeholder={field.placeholder}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleSaveSection(section.section)}
                      disabled={isLoading}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
  );
}