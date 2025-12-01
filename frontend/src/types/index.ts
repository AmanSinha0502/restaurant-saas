export type Owner = {
  _id: string;
  ownerId?: string;
  fullName: string;
  email: string;
  phone?: string;
  password?: string;
  isActive: boolean;
  isFirstLogin?: boolean;
  ownedDatabases?: string[];
  lastLogin?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type PlatformStats = {
  totalOwners: number;
  activeOwners: number;
  inactiveOwners: number;
  newOwnersThisMonth: number;
  totalRestaurants?: number;
  totalOrders?: number;
  totalRevenue?: number;
  recentOwners?: Owner[];
};
