import Link from 'next/link';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Service } from '@/lib/types';

interface ServiceCardProps {
  service: Service;
}

export default function ServiceCard({ service }: ServiceCardProps) {
  return (
    <Card className="overflow-hidden group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="relative h-48 overflow-hidden">
        <Image
          src={service.image}
          alt={service.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {service.featured && (
          <Badge className="absolute top-4 left-4 bg-teal-500 hover:bg-teal-600 text-white">
            Destacado
          </Badge>
        )}
      </div>
      
      <CardContent className="p-6">
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">
            {service.title}
          </h3>
          
          <p className="text-gray-600 text-sm line-clamp-3">
            {service.description}
          </p>
          
          <Button
            asChild
            className="w-full bg-teal-500 hover:bg-teal-600 text-white"
          >
            <Link href={service.externalLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Reservar Experiencia
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}