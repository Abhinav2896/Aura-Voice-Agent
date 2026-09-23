'use client';

import Image from 'next/image';

interface SvgIconProps {
  name: string;
  size?: number;
  className?: string;
  alt?: string;
}

export function SvgIcon({ name, size = 24, className = '', alt }: SvgIconProps) {
  return (
    <Image
      src={`/assets/${name}.svg`}
      width={size}
      height={size}
      alt={alt ?? name}
      className={className}
    />
  );
}
