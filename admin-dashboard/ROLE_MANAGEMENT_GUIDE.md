# Role Management System Guide

## Overview

The Role Management System allows Master Administrators to assign specific permissions to Store Admins and Employees, controlling what they can see and access in the admin dashboard.

## Features

### 🔐 **Permission-Based Access Control**
- **Granular Permissions**: Assign specific modules and features to users
- **Dynamic Sidebar**: Users only see navigation items they have permission to access
- **Role-Based Filtering**: Different access levels for different user types

### 👥 **User Types**
1. **Master Admin**: Full access to everything, including role management
2. **Store Admin**: Limited access based on assigned permissions
3. **Employee**: Minimal access based on assigned permissions

### 📋 **Available Permissions**

#### **Management Category**
- **Dashboard**: View main dashboard and overview
- **Store Management**: Manage store information and settings
- **Customer Management**: View and manage customer information
- **Menu Management**: Manage menu items, categories, and pricing
- **Toppings Management**: Manage pizza toppings and ingredients
- **Sauces Management**: Manage wing sauces and dips
- **Combo Management**: Manage combo meals and packages
- **Categories**: Manage menu categories and organization
- **Customer Feedback**: View and respond to customer feedback
- **Discount Codes**: Manage promotional codes and discounts
- **User Management**: Manage user accounts and permissions

#### **Operations Category**
- **Orders**: View and manage customer orders
- **Kitchen Display**: View kitchen orders and preparation status

#### **Reports Category**
- **Job Status**: Monitor automated jobs and schedules
- **Live Logs**: View system logs and activity

#### **Settings Category**
- **System Settings**: Configure system settings and preferences
- **Appearance**: Customize store appearance and branding
- **Layout Manager**: Manage dashboard layout and widgets

## How to Use

### 1. **Access Role Management**
- Only Master Admins can access this module
- Navigate to "Role Management" in the sidebar

### 2. **View All Users**
- See all users in the system with their current roles and permissions
- Filter by role, store, or search by name/email

### 3. **Create New Users**
- Click "Add New User" button
- Fill in user details (name, email, role, assigned store)
- Set initial password
- Users start with no permissions (empty sidebar)

### 4. **Assign Permissions**
- Click the shield icon next to any user
- Select which modules they can access
- Permissions are organized by category for easy selection
- Save changes to update user access

### 5. **Manage Existing Users**
- Edit permissions for any user
- Delete users (with confirmation)
- View current permission count and list

## Permission Mapping

The system maps navigation items to specific permissions:

| Navigation Item | Permission ID | Description |
|----------------|---------------|-------------|
| Dashboard | `dashboard` | Main dashboard access |
| Store Management | `stores` | Store management features |
| User Management | `user_management` | User account management |
| Menu | `menu` | Menu item management |
| Categories | `categories` | Category management |
| Toppings | `toppings` | Toppings management |
| Sauces | `sauces` | Sauces management |
| Combos | `combos` | Combo management |
| Customers | `customers` | Customer management |
| Orders | `orders` | Order management |
| Kitchen Display | `kitchen` | Kitchen display system |
| Feedback | `feedback` | Customer feedback |
| Layout Manager | `layout_manager` | Dashboard layout |
| Appearance | `appearance` | Store appearance |
| Settings | `settings` | System settings |
| Live Logs | `live_logs` | System logs |
| Job Status | `job_status` | Job monitoring |
| Discount Codes | `discount_codes` | Promotional codes |

## Example Use Cases

### **Hamilton Store Manager**
**Assigned Permissions:**
- Dashboard
- Orders
- Kitchen Display
- Customers
- Feedback

**Result:** Hamilton manager can only see these 5 items in their sidebar, providing focused access to operational tasks.

### **Kitchen Staff**
**Assigned Permissions:**
- Kitchen Display
- Orders

**Result:** Kitchen staff only see order management and kitchen display, perfect for food preparation workflow.

### **Customer Service Employee**
**Assigned Permissions:**
- Dashboard
- Orders
- Customers
- Feedback

**Result:** Customer service staff can handle orders and customer inquiries without access to menu management.

## Security Features

### **Access Control**
- Only Master Admins can access Role Management
- Users cannot see navigation items they don't have permission for
- Permission changes take effect immediately

### **Data Protection**
- User passwords are securely stored
- Permission changes are logged
- Role-based access prevents unauthorized modifications

## Best Practices

### **Permission Assignment**
1. **Start Minimal**: Give users only the permissions they need
2. **Group by Function**: Assign related permissions together
3. **Regular Review**: Periodically review and update permissions
4. **Document Changes**: Keep track of permission changes

### **User Management**
1. **Clear Roles**: Define clear roles and responsibilities
2. **Store Assignment**: Always assign users to specific stores
3. **Active Monitoring**: Monitor user activity and access patterns
4. **Cleanup**: Remove permissions when users change roles

## Technical Implementation

### **Database Structure**
```javascript
// User document structure
{
  id: "user_id",
  name: "User Name",
  email: "user@example.com",
  role: "store_admin", // master_admin, store_admin, employee
  assignedStoreId: "store_001",
  permissions: ["dashboard", "orders", "kitchen"], // Array of permission IDs
  isActive: true,
  createdAt: "2024-01-01T00:00:00Z"
}
```

### **Permission Checking**
The system checks user permissions in real-time:
1. User logs in
2. Permissions are loaded from database
3. Sidebar is filtered based on permissions
4. Navigation items are hidden/shown accordingly

### **Dynamic Updates**
- Permission changes take effect immediately
- No need to restart or refresh
- Real-time permission validation

## Troubleshooting

### **Common Issues**

**User can't see expected navigation items:**
- Check if user has the required permissions
- Verify permission mapping is correct
- Ensure user role is properly set

**Permission changes not taking effect:**
- Check if user is logged out and back in
- Verify database updates were successful
- Clear browser cache if needed

**Role Management not accessible:**
- Ensure user is a Master Admin
- Check if user has proper authentication
- Verify database permissions

### **Support**
For technical support or questions about the role management system, contact the system administrator. 