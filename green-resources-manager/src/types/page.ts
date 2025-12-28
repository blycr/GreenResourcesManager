export type ResourceType = 'Game' | 'Image' | 'Video' | 'Novel' | 'Website' | 'Audio';

export interface PageConfig {
  id: string;
  name: string;
  icon: string;
  type: ResourceType;
  description?: string;
  isDefault?: boolean;
  isHidden?: boolean;
  filters?: {
    tags?: string[];
    excludeTags?: string[];
    [key: string]: any;
  };
  order: number;
  createdAt?: number;
  updatedAt?: number;
}
