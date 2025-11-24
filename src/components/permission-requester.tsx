
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';

// Define the permissions we need
const permissions = [
  {
    id: 'storage',
    name: 'Accès aux photos et vidéos',
    description: "WanderLink a besoin d'accès à vos photos et vidéos pour vous permettre de les partager dans vos conversations.",
    request: async () => {
      const cameraPerms = await Camera.requestPermissions({ permissions: ['photos'] });
      if (cameraPerms.photos !== 'granted') {
        throw new Error('Permission de stockage non accordée');
      }
      return cameraPerms.photos;
    },
  },
  {
    id: 'camera',
    name: 'Appareil photo',
    description: "WanderLink a besoin d'accès à votre appareil photo pour vous permettre de prendre des photos et de passer des appels vidéo.",
    request: async () => {
      const cameraPerms = await Camera.requestPermissions({ permissions: ['camera'] });
      if (cameraPerms.camera !== 'granted') {
        throw new Error('Permission de caméra non accordée');
      }
      return cameraPerms.camera;
    },
  },
  {
    id: 'microphone',
    name: 'Microphone',
    description: "WanderLink a besoin d'accès à votre microphone pour vous permettre de passer des appels audio et vidéo.",
    // Note: Capacitor's Camera plugin handles microphone permission along with camera for video recording.
    // If you add a dedicated voice recording feature, you might need a separate microphone plugin.
    // For now, we'll re-check the camera permission which implies microphone for video calls.
    request: async () => {
        // Typically, microphone is requested with Camera. We re-check to be sure.
        const micPerms = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
         if (micPerms.camera !== 'granted') { // We assume mic is granted with camera
           throw new Error('Permission de microphone non accordée');
         }
         return micPerms.camera;
    }
  },
];

interface PermissionRequesterProps {
  onAllPermissionsGranted: () => void;
}

export function PermissionRequester({ onAllPermissionsGranted }: PermissionRequesterProps) {
  const [currentPermissionIndex, setCurrentPermissionIndex] = useState<number>(0);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(true);

  useEffect(() => {
    if (currentPermissionIndex >= permissions.length) {
      setIsDialogOpen(false);
      onAllPermissionsGranted();
    }
  }, [currentPermissionIndex, onAllPermissionsGranted]);

  const handleRequestPermission = async () => {
    const permission = permissions[currentPermissionIndex];
    try {
      await permission.request();
      // Move to the next permission
      setCurrentPermissionIndex(currentPermissionIndex + 1);
    } catch (error) {
      console.error(error);
      // Optional: show a toast or message to the user that they denied the permission
      // For simplicity, we just move to the next one. Or you could halt the process.
       setCurrentPermissionIndex(currentPermissionIndex + 1);
    }
  };

  const currentPermission = permissions[currentPermissionIndex];

  if (!currentPermission) {
    return null;
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{currentPermission.name}</DialogTitle>
          <DialogDescription>
            {currentPermission.description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleRequestPermission}>Continuer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
