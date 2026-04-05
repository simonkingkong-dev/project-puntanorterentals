import Link from 'next/link';
import { Facebook, Home, Instagram, Mail, MapPin, Phone, Twitter } from 'lucide-react';
import { getContactInfoAdmin } from '@/lib/firebase-admin-queries';
import { tServer } from '@/lib/i18n/server';

export default async function Footer() {
  const contact = await getContactInfoAdmin();
  const social = contact?.socialMedia ?? {};
  const quickLinks = await tServer('footer_quick_links', 'Quick Links');
  const about = await tServer('footer_about', 'About Us');
  const contactLabel = await tServer('footer_contact', 'Contact');
  const support = await tServer('footer_support', 'Support');
  const helpCenter = await tServer('footer_help_center', 'Help Center');
  const terms = await tServer('footer_terms', 'Terms of Use');
  const privacy = await tServer('footer_privacy', 'Privacy Policy');
  const cancellation = await tServer('footer_cancellation', 'Cancellation Policy');
  const properties = await tServer('nav_properties', 'Properties');
  const tagline = await tServer('footer_tagline', 'Exceptional vacation properties that create unforgettable memories.');
  const createdWith = await tServer('footer_created_with', 'Made with ❤️ for exceptional travelers');

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <Home className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-lg font-bold leading-none">Punta Norte</span>
                <span className="text-sm font-light leading-none">Rentals</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm">
              {tagline}
            </p>
            <div className="flex space-x-4">
              {social.facebook ? (
                <Link href={social.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors" aria-label="Facebook">
                  <Facebook className="w-5 h-5" />
                </Link>
              ) : (
                <span className="text-gray-500"><Facebook className="w-5 h-5" /></span>
              )}
              {social.instagram ? (
                <Link href={social.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors" aria-label="Instagram">
                  <Instagram className="w-5 h-5" />
                </Link>
              ) : (
                <span className="text-gray-500"><Instagram className="w-5 h-5" /></span>
              )}
              {social.twitter ? (
                <Link href={social.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors" aria-label="Twitter">
                  <Twitter className="w-5 h-5" />
                </Link>
              ) : (
                <span className="text-gray-500"><Twitter className="w-5 h-5" /></span>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{quickLinks}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/properties" className="text-gray-400 hover:text-white transition-colors">
                  {properties}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-400 hover:text-white transition-colors">
                  {about}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
                  {contactLabel}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{support}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/help" className="text-gray-400 hover:text-white transition-colors">
                  {helpCenter}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                  {terms}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                  {privacy}
                </Link>
              </li>
              <li>
                <Link href="/cancellation" className="text-gray-400 hover:text-white transition-colors">
                  {cancellation}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{contactLabel}</h3>
            <ul className="space-y-3">
              <li className="flex items-center space-x-3">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-gray-400 text-sm">{contact?.address ?? '—'}</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                {contact?.phone ? (
                  <a href={`tel:${contact.phone}`} className="text-gray-400 text-sm hover:text-white">{contact.phone}</a>
                ) : (
                  <span className="text-gray-400 text-sm">—</span>
                )}
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                {contact?.email ? (
                  <a href={`mailto:${contact.email}`} className="text-gray-400 text-sm hover:text-white">{contact.email}</a>
                ) : (
                  <span className="text-gray-400 text-sm">—</span>
                )}
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              {contact?.copyright ?? '© 2025 Punta Norte Rentals. Todos los derechos reservados.'}
            </p>
            <p className="text-gray-400 text-sm mt-2 md:mt-0">
              {createdWith}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}