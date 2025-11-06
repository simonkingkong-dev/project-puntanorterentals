"use client";

import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { handleDeleteProperty } from "./actions"; // Importamos la Server Action
import { toast } from "sonner";

interface DeletePropertyButtonProps {
  propertyId: string;
}

export default function DeletePropertyButton({ propertyId }: DeletePropertyButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const onDeleteConfirm = () => {
    startTransition(async () => {
      const result = await handleDeleteProperty(propertyId);
      
      if (result.success) {
        toast.success("Propiedad borrada exitosamente.");
      } else {
        toast.error(result.error || "Error al borrar la propiedad.");
      }
      setIsOpen(false);
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        {/* El botón de basura que abre el diálogo */}
        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Esto borrará permanentemente la propiedad
            de la base de datos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onDeleteConfirm} 
            disabled={isPending} 
            className="bg-red-600 hover:bg-red-700"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              "Sí, borrar"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}