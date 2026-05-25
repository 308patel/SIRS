export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  WORKSPACE_MANAGER = 'WORKSPACE_MANAGER',
  LOGISTIC_MANAGER = 'LOGISTIC_MANAGER',
  COMPANY = 'COMPANY',
  USER = 'USER'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum CompanyStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
}

export enum CapacityUnit{
  SQF = 'SQF',
  CBM = 'CBM',
  PALLETS= 'PALLETS'
}

export enum WarehouseType{
  AMBIENT = 'AMBIENT',
  COLD = 'COLD',
  HAZMAT = 'HAZMAT'
}

export enum WarehouseStatus{
  OPERATIONAL = 'OPERATIONAL',
  MAINTENANCE = 'MAINTENANCE'
}

export enum StockMovementType {
  IN = 'IN',
  OUT = 'OUT',
  ADJUSTMENT = 'ADJUSTMENT',
  TRANSFER = 'TRANSFER'
}

export enum TransferStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DISPATCHED = 'DISPATCHED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}
