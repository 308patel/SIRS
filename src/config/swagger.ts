import express, { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Warehouse & Supply Chain Management API',
    version: '1.0.0',
    description: 'Comprehensive API documentation for the Warehouse, Inventory, Stock Transfer, and Ordering system backed by Prisma and Express.',
    contact: {
      name: 'API Support',
      email: 'support@example.com'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local Development Server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token to access protected endpoints. For company endpoints, log in as a Company to receive the token. For other endpoints, log in as a User (e.g. USER, ADMIN, WORKSPACE_MANAGER, LOGISTIC_MANAGER).'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', nullable: true },
          role: { type: 'string', enum: ['SUPER_ADMIN', 'ADMIN', 'WORKSPACE_MANAGER', 'LOGISTIC_MANAGER', 'USER'] },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
          profile_image: { type: 'string', nullable: true },
          last_login_at: { type: 'string', format: 'date-time', nullable: true },
          email_verified: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      Company: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          contact_no: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['ACTIVE', 'PENDING', 'SUSPENDED'] },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      Warehouse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          warehouse_company_id: { type: 'string' },
          warehouse_code: { type: 'string' },
          name: { type: 'string' },
          contact_phone: { type: 'string', nullable: true },
          operating_hours: { type: 'string', nullable: true },
          is_active: { type: 'boolean' },
          status: { type: 'string', enum: ['OPERATIONAL', 'MAINTENANCE'] },
          warehouse_manager_id: { type: 'string', nullable: true },
          logistic_manager_id: { type: 'string', nullable: true },
          created_by_id: { type: 'string', nullable: true },
          updated_by_id: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      WarehouseLocation: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          warehouse_id: { type: 'string' },
          address_line1: { type: 'string' },
          address_line2: { type: 'string', nullable: true },
          city: { type: 'string' },
          state: { type: 'string' },
          pincode: { type: 'string' },
          country: { type: 'string' },
          latitude: { type: 'number', format: 'decimal', nullable: true },
          longitude: { type: 'number', format: 'decimal', nullable: true }
        }
      },
      WarehouseCapacity: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          warehouse_id: { type: 'string' },
          total_capacity: { type: 'number' },
          capacity_unit: { type: 'string', enum: ['SQF', 'CBM', 'PALLETS'] },
          warehouse_type: { type: 'string', enum: ['AMBIENT', 'COLD', 'HAZMAT'] }
        }
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          sku: { type: 'string' },
          description: { type: 'string', nullable: true },
          price: { type: 'number' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      Inventory: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          warehouse_id: { type: 'string' },
          product_id: { type: 'string' },
          quantity: { type: 'integer' },
          low_stock_threshold: { type: 'integer' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      StockMovement: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          inventory_id: { type: 'string' },
          type: { type: 'string', enum: ['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER'] },
          quantity: { type: 'integer' },
          reference_id: { type: 'string', nullable: true },
          reason: { type: 'string', nullable: true },
          created_by_id: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      Transfer: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          source_warehouse_id: { type: 'string' },
          destination_warehouse_id: { type: 'string' },
          product_id: { type: 'string' },
          quantity: { type: 'integer' },
          status: { type: 'string', enum: ['PENDING', 'APPROVED', 'DISPATCHED', 'RECEIVED', 'CANCELLED'] },
          requested_by_id: { type: 'string', nullable: true },
          approved_by_id: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          user_id: { type: 'string' },
          status: { type: 'string', enum: ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] },
          total_amount: { type: 'number' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      OrderItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          order_id: { type: 'string' },
          product_id: { type: 'string' },
          quantity: { type: 'integer' },
          price: { type: 'number' }
        }
      }
    }
  },
  paths: {
    '/api/users/signup': {
      post: {
        tags: ['Authentication & Users'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'John Doe' },
                  email: { type: 'string', format: 'email', example: 'john@example.com' },
                  phone: { type: 'string', example: '+1234567890' },
                  password: { type: 'string', format: 'password', example: 'mypassword123' },
                  role: { type: 'string', enum: ['SUPER_ADMIN', 'ADMIN', 'WORKSPACE_MANAGER', 'LOGISTIC_MANAGER', 'USER'], default: 'USER' }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 201 },
                    message: { type: 'string', example: 'User registered successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsIn...' },
                        userId: { type: 'string', example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' }
                      }
                    }
                  }
                }
              }
            }
          },
          400: { description: 'Email already in use / Invalid input' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/users/login': {
      post: {
        tags: ['Authentication & Users'],
        summary: 'Log in a user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'john@example.com' },
                  password: { type: 'string', format: 'password', example: 'mypassword123' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'User logged in successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 200 },
                    message: { type: 'string', example: 'User logged in successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsIn...' },
                        refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsIn...' },
                        userId: { type: 'string', example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' }
                      }
                    }
                  }
                }
              }
            }
          },
          400: { description: 'Invalid credentials' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/users/changepassword': {
      post: {
        security: [{ bearerAuth: [] }],
        tags: ['Authentication & Users'],
        summary: 'Change password of logged-in user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['oldPassword', 'newPassword'],
                properties: {
                  oldPassword: { type: 'string', format: 'password' },
                  newPassword: { type: 'string', format: 'password' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Password updated successfully' },
          400: { description: 'Old password incorrect' },
          401: { description: 'Unauthorized' },
          404: { description: 'User not found' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/users/forgotpassword': {
      post: {
        tags: ['Authentication & Users'],
        summary: 'Request password reset link',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'john@example.com' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Password reset link sent (mock)' }
        }
      }
    },
    '/api/users/checkemail/{email}': {
      get: {
        tags: ['Authentication & Users'],
        summary: 'Check if an email already exists',
        parameters: [
          {
            name: 'email',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'email' },
            description: 'Email to check'
          }
        ],
        responses: {
          200: {
            description: 'Email checked status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 200 },
                    message: { type: 'string', example: 'Email checked successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        exists: { type: 'boolean', example: false }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/users/logout': {
      post: {
        security: [{ bearerAuth: [] }],
        tags: ['Authentication & Users'],
        summary: 'Logout user (client should discard token)',
        responses: {
          200: { description: 'Logged out successfully' },
          401: { description: 'Unauthorized' }
        }
      }
    },
    '/api/users/refreshtoken': {
      post: {
        tags: ['Authentication & Users'],
        summary: 'Refresh session tokens using refresh token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsIn...' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Token refreshed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 200 },
                    message: { type: 'string', example: 'Token refreshed successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        token: { type: 'string', example: 'newAccessToken...' },
                        refreshToken: { type: 'string', example: 'newRefreshToken...' }
                      }
                    }
                  }
                }
              }
            }
          },
          400: { description: 'Refresh token required' },
          401: { description: 'Invalid refresh token' }
        }
      }
    },
    '/api/companies/register': {
      post: {
        tags: ['Company Management'],
        summary: 'Register a new company (default state PENDING approval)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Acme Corp' },
                  email: { type: 'string', format: 'email', example: 'acme@example.com' },
                  contact_no: { type: 'string', example: '+1999999999' },
                  password: { type: 'string', format: 'password', example: 'companypass123' }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Company registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 201 },
                    message: { type: 'string', example: 'Company registered successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        companyId: { type: 'string', format: 'uuid' },
                        status: { type: 'string', example: 'PENDING' }
                      }
                    }
                  }
                }
              }
            }
          },
          400: { description: 'Company email already registered' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/companies/login': {
      post: {
        tags: ['Company Management'],
        summary: 'Log in as a Company (returns JWT with role COMPANY)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'acme@example.com' },
                  password: { type: 'string', format: 'password', example: 'companypass123' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Company logged in successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 200 },
                    message: { type: 'string', example: 'Company logged in successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        token: { type: 'string', example: 'companyJwtToken...' },
                        companyId: { type: 'string', format: 'uuid' }
                      }
                    }
                  }
                }
              }
            }
          },
          400: { description: 'Invalid credentials' },
          403: { description: 'Company not active (e.g. PENDING or SUSPENDED)' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/companies/users-list/{company_id}': {
      get: {
        security: [{ bearerAuth: [] }],
        tags: ['Company Management'],
        summary: 'List users belonging to a company (SUPER_ADMIN or COMPANY roles only)',
        parameters: [
          {
            name: 'company_id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'ID of the company'
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 },
            description: 'Page number'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 10 },
            description: 'Number of records per page'
          },
          {
            name: 'name',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by user name'
          },
          {
            name: 'email',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by user email'
          }
        ],
        responses: {
          200: {
            description: 'User list retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 200 },
                    message: { type: 'string', example: 'User list retrieved successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        users: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              name: { type: 'string' },
                              email: { type: 'string' },
                              phone: { type: 'string', nullable: true },
                              profile_image: { type: 'string', nullable: true },
                              role: { type: 'string' },
                              status: { type: 'string' }
                            }
                          }
                        },
                        total: { type: 'integer', example: 1 }
                      }
                    }
                  }
                }
              }
            }
          },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden (insufficient role)' },
          404: { description: 'Company not found' }
        }
      }
    },
    '/api/admin/company/{id}/status': {
      patch: {
        security: [{ bearerAuth: [] }],
        tags: ['Admin Actions'],
        summary: 'Approve or Suspend a company status (SUPER_ADMIN only)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Company ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED'], example: 'ACTIVE' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Status updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 200 },
                    message: { type: 'string', example: 'Status updated' },
                    company: { $ref: '#/components/schemas/Company' }
                  }
                }
              }
            }
          },
          400: { description: 'Invalid status value' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden (insufficient role)' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/admin/company/list': {
      get: {
        security: [{ bearerAuth: [] }],
        tags: ['Admin Actions'],
        summary: 'Get all companies categorized by status (SUPER_ADMIN only)',
        responses: {
          200: {
            description: 'Companies list retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 200 },
                    message: { type: 'string', example: 'company list retrieved successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        active: { type: 'array', items: { $ref: '#/components/schemas/Company' } },
                        pending: { type: 'array', items: { $ref: '#/components/schemas/Company' } },
                        suspended: { type: 'array', items: { $ref: '#/components/schemas/Company' } }
                      }
                    }
                  }
                }
              }
            }
          },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/warehouse': {
      post: {
        security: [{ bearerAuth: [] }],
        tags: ['Warehouse Operations'],
        summary: 'Create a new warehouse (COMPANY role only)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'contact_phone', 'operating_hours', 'status', 'total_capacity', 'capacity_unit', 'warehouse_type', 'address_line1', 'city', 'state', 'pincode', 'country'],
                properties: {
                  name: { type: 'string', example: 'Main Logistics Hub' },
                  contact_phone: { type: 'string', example: '+12223334444' },
                  operating_hours: { type: 'string', example: '08:00 - 20:00' },
                  status: { type: 'string', enum: ['OPERATIONAL', 'MAINTENANCE'], example: 'OPERATIONAL' },
                  warehouse_manager_id: { type: 'string', format: 'uuid', example: 'mngr-uuid-123' },
                  logistic_manager_id: { type: 'string', format: 'uuid', example: 'log-uuid-123' },
                  total_capacity: { type: 'number', example: 5000 },
                  capacity_unit: { type: 'string', enum: ['SQF', 'CBM', 'PALLETS'], example: 'SQF' },
                  warehouse_type: { type: 'string', enum: ['AMBIENT', 'COLD', 'HAZMAT'], example: 'AMBIENT' },
                  address_line1: { type: 'string', example: '123 Industrial Pkwy' },
                  address_line2: { type: 'string', example: 'Suite A' },
                  city: { type: 'string', example: 'Metropolis' },
                  state: { type: 'string', example: 'NY' },
                  pincode: { type: 'string', example: '10001' },
                  country: { type: 'string', example: 'USA' },
                  latitude: { type: 'number', example: 40.7128 },
                  longitude: { type: 'number', example: -74.006 }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Warehouse created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 201 },
                    message: { type: 'string', example: 'Warehouse created successfully' },
                    data: { type: 'object' }
                  }
                }
              }
            }
          },
          400: { description: 'Missing fields / invalid inputs' },
          404: { description: 'Company not found' },
          500: { description: 'Server error' }
        }
      },
      get: {
        security: [{ bearerAuth: [] }],
        tags: ['Warehouse Operations'],
        summary: 'List all warehouses for the authenticated company (ADMIN or COMPANY roles)',
        responses: {
          200: {
            description: 'Warehouses retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 200 },
                    message: { type: 'string', example: 'warehouse list retrieved successfully' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Warehouse' } }
                  }
                }
              }
            }
          },
          401: { description: 'Unauthorized' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/warehouse/{warehouse_id}': {
      get: {
        security: [{ bearerAuth: [] }],
        tags: ['Warehouse Operations'],
        summary: 'Get details of a specific warehouse by ID (ADMIN or COMPANY roles)',
        parameters: [
          {
            name: 'warehouse_id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Warehouse ID'
          }
        ],
        responses: {
          200: {
            description: 'Warehouse details retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 200 },
                    message: { type: 'string', example: 'warehouse retrieved successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        warehouse_company_id: { type: 'string' },
                        warehouse_code: { type: 'string' },
                        name: { type: 'string' },
                        contact_phone: { type: 'string', nullable: true },
                        operating_hours: { type: 'string', nullable: true },
                        is_active: { type: 'boolean' },
                        status: { type: 'string' },
                        warehouse_capacity: { type: 'array', items: { $ref: '#/components/schemas/WarehouseCapacity' } },
                        warehouse_location: { type: 'array', items: { $ref: '#/components/schemas/WarehouseLocation' } },
                        logistic_manager: { type: 'object', nullable: true },
                        warehouse_manager: { type: 'object', nullable: true }
                      }
                    }
                  }
                }
              }
            }
          },
          401: { description: 'Unauthorized' },
          500: { description: 'Server error' }
        }
      },
      delete: {
        security: [{ bearerAuth: [] }],
        tags: ['Warehouse Operations'],
        summary: 'Soft-delete a warehouse (COMPANY role only)',
        parameters: [
          {
            name: 'warehouse_id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Warehouse ID'
          }
        ],
        responses: {
          200: { description: 'Warehouse deleted successfully' },
          403: { description: 'Forbidden (Not authorized for this warehouse)' },
          404: { description: 'Warehouse not found' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/warehouse/{id}': {
      put: {
        security: [{ bearerAuth: [] }],
        tags: ['Warehouse Operations'],
        summary: 'Update warehouse details (ADMIN or COMPANY roles)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Warehouse ID to update'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  contact_phone: { type: 'string' },
                  operating_hours: { type: 'string' },
                  status: { type: 'string', enum: ['OPERATIONAL', 'MAINTENANCE'] },
                  is_active: { type: 'boolean' },
                  warehouse_manager_id: { type: 'string', format: 'uuid' },
                  logistic_manager_id: { type: 'string', format: 'uuid' },
                  total_capacity: { type: 'number' },
                  capacity_unit: { type: 'string', enum: ['SQF', 'CBM', 'PALLETS'] },
                  warehouse_type: { type: 'string', enum: ['AMBIENT', 'COLD', 'HAZMAT'] },
                  address_line1: { type: 'string' },
                  address_line2: { type: 'string' },
                  city: { type: 'string' },
                  state: { type: 'string' },
                  pincode: { type: 'string' },
                  country: { type: 'string' },
                  latitude: { type: 'number' },
                  longitude: { type: 'number' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Warehouse updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 200 },
                    message: { type: 'string', example: 'Warehouse updated successfully' },
                    data: { $ref: '#/components/schemas/Warehouse' }
                  }
                }
              }
            }
          },
          403: { description: 'Forbidden (Not authorized for this warehouse)' },
          404: { description: 'Warehouse not found' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/transfers': {
      post: {
        security: [{ bearerAuth: [] }],
        tags: ['Stock Transfers'],
        summary: 'Create stock transfer request (LOGISTIC_MANAGER or ADMIN roles)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['source_warehouse_id', 'destination_warehouse_id', 'product_id', 'quantity'],
                properties: {
                  source_warehouse_id: { type: 'string', format: 'uuid', example: 'wh-uuid-source' },
                  destination_warehouse_id: { type: 'string', format: 'uuid', example: 'wh-uuid-dest' },
                  product_id: { type: 'string', format: 'uuid', example: 'prod-uuid-123' },
                  quantity: { type: 'integer', example: 50 }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Transfer request created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 201 },
                    message: { type: 'string', example: 'Transfer request created successfully' },
                    data: { $ref: '#/components/schemas/Transfer' }
                  }
                }
              }
            }
          },
          400: { description: 'Missing fields / same source and destination / quantity <= 0' },
          404: { description: 'One or both warehouses, or product not found' },
          500: { description: 'Server error' }
        }
      },
      get: {
        security: [{ bearerAuth: [] }],
        tags: ['Stock Transfers'],
        summary: 'List all transfers (ADMIN, WORKSPACE_MANAGER, LOGISTIC_MANAGER roles)',
        responses: {
          200: {
            description: 'Transfers retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 200 },
                    message: { type: 'string', example: 'Transfers retrieved successfully' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Transfer' } }
                  }
                }
              }
            }
          },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/transfers/suggest': {
      get: {
        security: [{ bearerAuth: [] }],
        tags: ['Stock Transfers'],
        summary: 'Auto-suggest stock redistribution options based on low stock thresholds (LOGISTIC_MANAGER or ADMIN roles)',
        responses: {
          200: {
            description: 'Suggestions generated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 200 },
                    message: { type: 'string', example: 'Redistribution transfer suggestions generated successfully' },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          product: {
                            type: 'object',
                            properties: { id: { type: 'string' }, name: { type: 'string' }, sku: { type: 'string' } }
                          },
                          source_warehouse: {
                            type: 'object',
                            properties: { id: { type: 'string' }, name: { type: 'string' }, available_stock: { type: 'integer' }, low_stock_threshold: { type: 'integer' } }
                          },
                          destination_warehouse: {
                            type: 'object',
                            properties: { id: { type: 'string' }, name: { type: 'string' }, current_stock: { type: 'integer' }, low_stock_threshold: { type: 'integer' } }
                          },
                          suggested_quantity: { type: 'integer' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/transfers/{id}': {
      get: {
        security: [{ bearerAuth: [] }],
        tags: ['Stock Transfers'],
        summary: 'Get detailed info on a transfer (ADMIN, WORKSPACE_MANAGER, LOGISTIC_MANAGER roles)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Transfer ID'
          }
        ],
        responses: {
          200: {
            description: 'Transfer details retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 200 },
                    message: { type: 'string', example: 'Transfer details retrieved successfully' },
                    data: { $ref: '#/components/schemas/Transfer' }
                  }
                }
              }
            }
          },
          404: { description: 'Transfer not found' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/transfers/{id}/approve': {
      patch: {
        security: [{ bearerAuth: [] }],
        tags: ['Stock Transfers'],
        summary: 'Approve a pending transfer request (ADMIN role only)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Transfer ID'
          }
        ],
        responses: {
          200: { description: 'Transfer approved successfully' },
          400: { description: 'Transfer is not in PENDING state' },
          404: { description: 'Transfer not found' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/transfers/{id}/dispatch': {
      patch: {
        security: [{ bearerAuth: [] }],
        tags: ['Stock Transfers'],
        summary: 'Mark a transfer as dispatched and deduct inventory from source (WORKSPACE_MANAGER role only)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Transfer ID'
          }
        ],
        responses: {
          200: { description: 'Transfer dispatched successfully' },
          400: { description: 'Insufficient stock or invalid status (must be APPROVED)' },
          404: { description: 'Transfer not found' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/transfers/{id}/receive': {
      patch: {
        security: [{ bearerAuth: [] }],
        tags: ['Stock Transfers'],
        summary: 'Mark a transfer as received and add inventory to destination (WORKSPACE_MANAGER role only)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Transfer ID'
          }
        ],
        responses: {
          200: { description: 'Transfer received successfully' },
          400: { description: 'Invalid transfer status (must be DISPATCHED)' },
          404: { description: 'Transfer not found' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/inventory': {
      post: {
        security: [{ bearerAuth: [] }],
        tags: ['Inventory Management'],
        summary: 'Add or intake a product in a warehouse (WORKSPACE_MANAGER role only)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['warehouse_id', 'product_name', 'sku', 'price'],
                properties: {
                  warehouse_id: { type: 'string', format: 'uuid', example: 'wh-uuid-123' },
                  product_name: { type: 'string', example: 'Ergonomic Desk Chair' },
                  sku: { type: 'string', example: 'FUR-CHA-001' },
                  price: { type: 'number', example: 149.99 },
                  description: { type: 'string', example: 'Comfortable mesh chair' },
                  quantity: { type: 'integer', default: 0, example: 20 },
                  low_stock_threshold: { type: 'integer', default: 10, example: 5 }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Product inventory added/updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 201 },
                    message: { type: 'string' },
                    data: { $ref: '#/components/schemas/Inventory' }
                  }
                }
              }
            }
          },
          400: { description: 'Missing fields' },
          404: { description: 'Warehouse not found' },
          500: { description: 'Server error' }
        }
      },
      get: {
        security: [{ bearerAuth: [] }],
        tags: ['Inventory Management'],
        summary: 'List all inventory items (ADMIN, WORKSPACE_MANAGER, LOGISTIC_MANAGER roles)',
        responses: {
          200: {
            description: 'Inventory list retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 200 },
                    message: { type: 'string' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Inventory' } }
                  }
                }
              }
            }
          },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/inventory/low-stock': {
      get: {
        security: [{ bearerAuth: [] }],
        tags: ['Inventory Management'],
        summary: 'Get low stock inventory items (ADMIN, WORKSPACE_MANAGER, LOGISTIC_MANAGER roles)',
        responses: {
          200: {
            description: 'Low stock items list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 200 },
                    message: { type: 'string' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Inventory' } }
                  }
                }
              }
            }
          },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/inventory/alerts': {
      get: {
        security: [{ bearerAuth: [] }],
        tags: ['Inventory Management'],
        summary: 'Get low stock and high capacity alerts for warehouses (ADMIN, WORKSPACE_MANAGER, LOGISTIC_MANAGER roles)',
        responses: {
          200: {
            description: 'Inventory alerts generated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 200 },
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        low_stock: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              type: { type: 'string', example: 'LOW_STOCK' },
                              inventory_id: { type: 'string' },
                              warehouse: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } },
                              product: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, sku: { type: 'string' } } },
                              quantity: { type: 'integer' },
                              threshold: { type: 'integer' },
                              message: { type: 'string' }
                            }
                          }
                        },
                        capacity: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              type: { type: 'string', example: 'HIGH_CAPACITY' },
                              warehouse: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } },
                              total_capacity: { type: 'number' },
                              unit: { type: 'string' },
                              current_stock_count: { type: 'integer' },
                              utilization_percentage: { type: 'number' },
                              message: { type: 'string' }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/inventory/warehouse/{warehouseId}': {
      get: {
        security: [{ bearerAuth: [] }],
        tags: ['Inventory Management'],
        summary: 'Get inventory list for a specific warehouse (ADMIN, WORKSPACE_MANAGER, LOGISTIC_MANAGER roles)',
        parameters: [
          {
            name: 'warehouseId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Warehouse ID'
          }
        ],
        responses: {
          200: {
            description: 'Warehouse stock list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 200 },
                    message: { type: 'string' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Inventory' } }
                  }
                }
              }
            }
          },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/inventory/product/{productId}': {
      get: {
        security: [{ bearerAuth: [] }],
        tags: ['Inventory Management'],
        summary: 'Get stock of a specific product across all warehouses (ADMIN, WORKSPACE_MANAGER, LOGISTIC_MANAGER roles)',
        parameters: [
          {
            name: 'productId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Product ID'
          }
        ],
        responses: {
          200: {
            description: 'Stock of product list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 200 },
                    message: { type: 'string' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Inventory' } }
                  }
                }
              }
            }
          },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/inventory/{id}/adjust': {
      patch: {
        security: [{ bearerAuth: [] }],
        tags: ['Inventory Management'],
        summary: 'Manually adjust stock level of an inventory record (WORKSPACE_MANAGER role only)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Inventory ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  quantity: { type: 'integer', description: 'Set absolute stock level' },
                  adjustment: { type: 'integer', description: 'Delta to adjust by (e.g. +5 or -2)' },
                  reason: { type: 'string', example: 'Damaged item removed' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Stock adjusted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 200 },
                    message: { type: 'string' },
                    data: { $ref: '#/components/schemas/Inventory' }
                  }
                }
              }
            }
          },
          400: { description: 'Missing parameters / quantity < 0' },
          404: { description: 'Inventory record not found' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/inventory/{id}/history': {
      get: {
        security: [{ bearerAuth: [] }],
        tags: ['Inventory Management'],
        summary: 'Get stock movement log for an inventory record (ADMIN or WORKSPACE_MANAGER roles)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Inventory ID'
          }
        ],
        responses: {
          200: {
            description: 'Stock movement history',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 200 },
                    message: { type: 'string' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/StockMovement' } }
                  }
                }
              }
            }
          },
          404: { description: 'Inventory not found' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/orders': {
      post: {
        security: [{ bearerAuth: [] }],
        tags: ['Orders Management'],
        summary: 'Place a new order and reserve/deduct stock (USER role only)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['warehouse_id', 'items'],
                properties: {
                  warehouse_id: { type: 'string', format: 'uuid', example: 'wh-uuid-123' },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['product_id', 'quantity'],
                      properties: {
                        product_id: { type: 'string', format: 'uuid', example: 'prod-uuid-123' },
                        quantity: { type: 'integer', example: 2 }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Order placed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 201 },
                    message: { type: 'string' },
                    data: { $ref: '#/components/schemas/Order' }
                  }
                }
              }
            }
          },
          400: { description: 'Missing fields / Insufficient stock / Product not found' },
          404: { description: 'Warehouse not found' },
          500: { description: 'Server error' }
        }
      },
      get: {
        security: [{ bearerAuth: [] }],
        tags: ['Orders Management'],
        summary: 'Get all orders across system (ADMIN, WORKSPACE_MANAGER, LOGISTIC_MANAGER roles)',
        responses: {
          200: {
            description: 'All orders retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 200 },
                    message: { type: 'string' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Order' } }
                  }
                }
              }
            }
          },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/orders/my': {
      get: {
        security: [{ bearerAuth: [] }],
        tags: ['Orders Management'],
        summary: 'Get own orders (USER role only)',
        responses: {
          200: {
            description: 'User\'s orders retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 200 },
                    message: { type: 'string' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Order' } }
                  }
                }
              }
            }
          },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/orders/{id}': {
      get: {
        security: [{ bearerAuth: [] }],
        tags: ['Orders Management'],
        summary: 'Get detailed view of a specific order (ADMIN, WORKSPACE_MANAGER, LOGISTIC_MANAGER, or order owner USER)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Order ID'
          }
        ],
        responses: {
          200: {
            description: 'Order details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 200 },
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        user_id: { type: 'string' },
                        status: { type: 'string' },
                        total_amount: { type: 'number' },
                        created_at: { type: 'string' },
                        updated_at: { type: 'string' },
                        order_items: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
                        user: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' } } }
                      }
                    }
                  }
                }
              }
            }
          },
          403: { description: 'Forbidden (Not owner and not management)' },
          404: { description: 'Order not found' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/orders/{id}/status': {
      patch: {
        security: [{ bearerAuth: [] }],
        tags: ['Orders Management'],
        summary: 'Update an order status (WORKSPACE_MANAGER or LOGISTIC_MANAGER roles)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Order ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'], example: 'PROCESSING' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Order status updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 200 },
                    message: { type: 'string' },
                    data: { $ref: '#/components/schemas/Order' }
                  }
                }
              }
            }
          },
          400: { description: 'Invalid status' },
          404: { description: 'Order not found' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/orders/{id}/cancel': {
      patch: {
        security: [{ bearerAuth: [] }],
        tags: ['Orders Management'],
        summary: 'Cancel order and return allocated items back to stock (USER (owner) or ADMIN roles)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Order ID'
          }
        ],
        responses: {
          200: { description: 'Order cancelled successfully and stock returned' },
          400: { description: 'Order already cancelled / Shipped / Delivered' },
          403: { description: 'Forbidden (Not owner and not admin)' },
          404: { description: 'Order not found' },
          500: { description: 'Server error' }
        }
      }
    },
    '/api/orders/{id}/track': {
      get: {
        security: [{ bearerAuth: [] }],
        tags: ['Orders Management'],
        summary: 'Track order shipping progress details (USER (owner) role only)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Order ID'
          }
        ],
        responses: {
          200: {
            description: 'Tracking status details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 200 },
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        order_id: { type: 'string' },
                        status: { type: 'string' },
                        last_updated: { type: 'string' },
                        details: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          },
          403: { description: 'Forbidden (not order owner)' },
          404: { description: 'Order not found' },
          500: { description: 'Server error' }
        }
      }
    }
  }
};

export const setupSwagger = (app: Express): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log('Swagger documentation is initialized on /api-docs');
};
