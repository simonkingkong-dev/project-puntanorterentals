'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Database, Mail, Save, Shield, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface SiteSettings {
  siteName?: string;
  siteUrl?: string;
  siteDescription?: string;
  contactEmail?: string;
  contactPhone?: string;
  emailNotifications?: boolean;
  autoConfirmations?: boolean;
  checkinReminders?: boolean;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/site-settings')
      .then(r => r.json())
      .then(data => setSettings(data.settings ?? {}))
      .catch(() => toast.error('No se pudo cargar la configuración'))
      .finally(() => setLoading(false));
  }, []);

  const update = (key: keyof SiteSettings, value: string | boolean) => {
    setSaved(false);
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/admin/site-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error desconocido');
      toast.success('Configuración guardada correctamente');
      setSaved(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-600">Gestiona la configuración general del sistema</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Guardado
          </div>
        )}
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
                value={settings.siteName ?? ''}
                onChange={e => update('siteName', e.target.value)}
                placeholder="Nombre de tu negocio"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteUrl">URL del Sitio</Label>
              <Input
                id="siteUrl"
                value={settings.siteUrl ?? ''}
                onChange={e => update('siteUrl', e.target.value)}
                placeholder="https://tu-sitio.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="siteDescription">Descripción del Sitio</Label>
            <Textarea
              id="siteDescription"
              value={settings.siteDescription ?? ''}
              onChange={e => update('siteDescription', e.target.value)}
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
                value={settings.contactEmail ?? ''}
                onChange={e => update('contactEmail', e.target.value)}
                placeholder="contacto@tu-sitio.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Teléfono de Contacto</Label>
              <Input
                id="contactPhone"
                value={settings.contactPhone ?? ''}
                onChange={e => update('contactPhone', e.target.value)}
                placeholder="+52 xxx xxx xxxx"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Firebase Settings — info only */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Configuración de Firebase
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Las configuraciones de Firebase se gestionan mediante
              variables de entorno en el servidor. Edítalas en tu archivo de entorno o en
              la plataforma de despliegue (Firebase App Hosting, Vercel, etc.).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stripe Settings — info only */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Configuración de Stripe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Importante:</strong> Las claves de Stripe (publishable key, secret key,
              webhook secret) se configuran como variables de entorno. Asegúrate de usar
              las claves de producción al desplegar.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Email / Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Notificaciones por Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notificaciones de nuevas reservas</Label>
              <p className="text-sm text-gray-600">
                Recibir un email cuando se realice una nueva reserva o pago
              </p>
            </div>
            <Switch
              checked={settings.emailNotifications ?? true}
              onCheckedChange={v => update('emailNotifications', v)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Confirmaciones automáticas</Label>
              <p className="text-sm text-gray-600">
                Enviar emails de confirmación al huésped automáticamente
              </p>
            </div>
            <Switch
              checked={settings.autoConfirmations ?? true}
              onCheckedChange={v => update('autoConfirmations', v)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Recordatorios de Check-in</Label>
              <p className="text-sm text-gray-600">
                Enviar recordatorios 24 horas antes del check-in
              </p>
            </div>
            <Switch
              checked={settings.checkinReminders ?? true}
              onCheckedChange={v => update('checkinReminders', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pb-8">
        <Button size="lg" onClick={handleSave} disabled={saving}>
          {saving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" />Guardar Configuración</>
          )}
        </Button>
      </div>
    </div>
  );
}
