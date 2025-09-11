"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, Globe, Mail, Phone, MapPin, Building, Copyright } from 'lucide-react';
import AdminLayout from '@/components/admin/layout';
import { toast } from 'sonner';
import { getContactInfo, updateContactInfo } from '@/lib/firebase/content';
import { ContactInfo } from '@/lib/types';

/**
 * Renders the Admin Contact Page allowing management of contact information.
 * @example
 * AdminContactPage()
 * // Renders the admin contact management interface and handles data persistence
 * @returns {JSX.Element} A JSX element that represents the admin contact page interface.
 */
export default function AdminContactPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [contactData, setContactData] = useState<Omit<ContactInfo, 'id' | 'updatedAt'>>({
    email: '',
    phone: '',
    address: '',
    companyName: '',
    copyright: '',
    socialMedia: {
      facebook: '',
      instagram: '',
      twitter: '',
    },
  });

  useEffect(() => {
    loadContactInfo();
  }, []);

  /**
  * Asynchronously fetches and sets contact information.
  * @example
  * sync();
  * // Sets contact data with email, phone, address, companyName, copyright, and social media information.
  * @returns {void} Does not return a value but sets contact data in the application state.
  **/
  const loadContactInfo = async () => {
    try {
      const info = await getContactInfo();
      if (info) {
        setContactData({
          email: info.email,
          phone: info.phone,
          address: info.address,
          companyName: info.companyName,
          copyright: info.copyright,
          socialMedia: info.socialMedia || {
            facebook: '',
            instagram: '',
            twitter: '',
          },
        });
      }
    } catch (error) {
      toast.error('Error cargando información de contacto');
    }
  };

  /**
   * Updates the contact data object with the new value for the specified field.
   * @example
   * updateContactData('socialMedia.twitter', '@user')
   * // This updates the 'twitter' field under 'socialMedia' with the value '@user'.
   * @param {string} field - The field name in the contact data object to be updated. If it starts with 'socialMedia.', it updates the respective social media sub-field.
   * @param {string} value - The new value to be set for the specified field.
   * @returns {void} Does not return a value; it updates the state directly.
   */
  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith('socialMedia.')) {
      const socialField = field.split('.')[1];
      setContactData(prev => ({
        ...prev,
        socialMedia: {
          ...prev.socialMedia,
          [socialField]: value,
        },
      }));
    } else {
      setContactData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateContactInfo(contactData);
      toast.success('Información de contacto guardada exitosamente');
    } catch (error) {
      toast.error('Error guardando información de contacto');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Información de Contacto</h1>
          <p className="text-gray-600">Gestiona la información de contacto y datos de la empresa</p>
        </div>

        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Información de la Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nombre de la Empresa</Label>
                <Input
                  id="companyName"
                  value={contactData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  placeholder="Casa Alkimia"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="copyright">Texto de Derechos de Autor</Label>
                <Input
                  id="copyright"
                  value={contactData.copyright}
                  onChange={(e) => handleInputChange('copyright', e.target.value)}
                  placeholder="© 2024 Casa Alkimia. Todos los derechos reservados."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Textarea
                id="address"
                value={contactData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Riviera Maya, Quintana Roo, México"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Datos de Contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email de Contacto</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    value={contactData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="hola@casaalkimia.com"
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono de Contacto</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="phone"
                    value={contactData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+52 984 123 4567"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Social Media */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Redes Sociales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  type="url"
                  value={contactData.socialMedia.facebook || ''}
                  onChange={(e) => handleInputChange('socialMedia.facebook', e.target.value)}
                  placeholder="https://facebook.com/casaalkimia"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  type="url"
                  value={contactData.socialMedia.instagram || ''}
                  onChange={(e) => handleInputChange('socialMedia.instagram', e.target.value)}
                  placeholder="https://instagram.com/casaalkimia"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="twitter">Twitter</Label>
                <Input
                  id="twitter"
                  type="url"
                  value={contactData.socialMedia.twitter || ''}
                  onChange={(e) => handleInputChange('socialMedia.twitter', e.target.value)}
                  placeholder="https://twitter.com/casaalkimia"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Vista Previa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-lg mb-2">{contactData.companyName || 'Nombre de la Empresa'}</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{contactData.address || 'Dirección no especificada'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>{contactData.email || 'Email no especificado'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>{contactData.phone || 'Teléfono no especificado'}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t text-xs text-gray-500">
                {contactData.copyright || '© 2024 Tu Empresa. Todos los derechos reservados.'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isLoading} size="lg">
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Guardando...' : 'Guardar Información'}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}