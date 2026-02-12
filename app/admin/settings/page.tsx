import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Database, Mail, Save, Shield } from 'lucide-react';
export const metadata: Metadata = {
  title: 'Configuración - Admin Panel',
  robots: 'noindex, nofollow',
};

/**
 * Renders the admin settings page allowing configuration of general,
 * Firebase, Stripe, and email settings for the system.
 *
 * @example
 * AdminSettingsPage()
 * React component rendering the admin settings page JSX structure
 * 
 * @returns {JSX.Element} The JSX element representing the admin settings page structure.
 */
export default function AdminSettingsPage() {
  return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-600">Gestiona la configuración general del sistema</p>
        </div>

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Configuración General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="siteName">Nombre del Sitio</Label>
                <Input
                  id="siteName"
                  defaultValue="Casa Alkimia"
                  placeholder="Nombre de tu negocio"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="siteUrl">URL del Sitio</Label>
                <Input
                  id="siteUrl"
                  defaultValue="https://casaalkimia.com"
                  placeholder="https://tu-sitio.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="siteDescription">Descripción del Sitio</Label>
              <Textarea
                id="siteDescription"
                defaultValue="Propiedades vacacionales excepcionales en destinos únicos. Experiencias inolvidables te esperan en Casa Alkimia."
                placeholder="Describe tu negocio..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email de Contacto</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  defaultValue="hola@casaalkimia.com"
                  placeholder="contacto@tu-sitio.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Teléfono de Contacto</Label>
                <Input
                  id="contactPhone"
                  defaultValue="+52 984 123 4567"
                  placeholder="+52 xxx xxx xxxx"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Firebase Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Configuración de Firebase
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firebaseProjectId">Project ID</Label>
                <Input
                  id="firebaseProjectId"
                  defaultValue="casa-alkimia-prod"
                  placeholder="tu-proyecto-firebase"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="firebaseApiKey">API Key</Label>
                <Input
                  id="firebaseApiKey"
                  type="password"
                  defaultValue="AIzaSyC..."
                  placeholder="Tu Firebase API Key"
                />
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> Las configuraciones de Firebase se manejan a través de variables de entorno. 
                Estos campos son solo informativos.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stripe Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Configuración de Stripe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stripePublishableKey">Publishable Key</Label>
                <Input
                  id="stripePublishableKey"
                  type="password"
                  defaultValue="pk_test_..."
                  placeholder="pk_test_..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="stripeSecretKey">Secret Key</Label>
                <Input
                  id="stripeSecretKey"
                  type="password"
                  defaultValue="sk_test_..."
                  placeholder="sk_test_..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stripeWebhookSecret">Webhook Secret</Label>
              <Input
                id="stripeWebhookSecret"
                type="password"
                defaultValue="whsec_..."
                placeholder="whsec_..."
              />
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Importante:</strong> Asegúrate de usar las claves de producción cuando despliegues el sitio.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Configuración de Email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificaciones por Email</Label>
                <p className="text-sm text-gray-600">
                  Recibir notificaciones de nuevas reservas y pagos
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Confirmaciones Automáticas</Label>
                <p className="text-sm text-gray-600">
                  Enviar emails de confirmación automáticamente
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Recordatorios de Check-in</Label>
                <p className="text-sm text-gray-600">
                  Enviar recordatorios 24 horas antes del check-in
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button size="lg">
            <Save className="w-4 h-4 mr-2" />
            Guardar Configuración
          </Button>
        </div>
      </div>
  );
}