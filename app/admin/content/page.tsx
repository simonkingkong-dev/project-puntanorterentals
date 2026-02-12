"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Home, Info, Save, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { getSiteContent } from '@/lib/firebase/content';
import { updateSiteContentAdmin } from './actions';

interface ContentSection {
  section: string;
  title: string;
  icon: LucideIcon;
  fields: {
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'image' | 'url';
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
      }
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
      const content = await getSiteContent();
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
          <TabsList className="grid w-full grid-cols-2">
            {contentSections.map((section) => (
              <TabsTrigger key={section.section} value={section.section} className="flex items-center gap-2">
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