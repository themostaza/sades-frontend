'use client';

import React from 'react';
import { XCircle } from 'lucide-react';
import Image from 'next/image';

interface LightboxProps {
  imageUrl: string | null;
  onClose: () => void;
}

export default function Lightbox({ imageUrl, onClose }: LightboxProps) {
  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black bg-opacity-90 flex items-center justify-center" onClick={onClose}>
      <div className="max-w-5xl max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
        <Image src={imageUrl} alt="Preview" width={1600} height={1200} className="w-auto h-auto max-w-full max-h-[85vh] object-contain" />
      </div>
      <button className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2" onClick={onClose}>
        <XCircle size={28} />
      </button>
    </div>
  );
}

