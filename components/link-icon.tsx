import React from 'react';
import { Globe } from 'lucide-react';

interface LinkIconProps {
  className?: string;
}

const LinkIcon: React.FC<LinkIconProps> = ({ className }) => {
  return (
    <div className={`flex items-center justify-center rounded-sm bg-primary/10 ${className}`}>
      <Globe className="h-4 w-4 text-primary" />
    </div>
  );
};

export default LinkIcon;
