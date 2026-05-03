import React, { useState } from 'react';
import AdminSettingsLayout from '../components/adminSettings/AdminSettingsLayout';
import UserManagementTab from '../components/adminSettings/tabs/UserManagementTab';
import DashboardSettingsTab from '../components/adminSettings/tabs/DashboardSettingsTab';
import MessagesManagerTab from '../components/adminSettings/tabs/MessagesManagerTab';
import SidebarMenuTab from '../components/adminSettings/tabs/SidebarMenuTab';
import SystemSettingsTab from '../components/adminSettings/tabs/SystemSettingsTab';

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState('users');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagementTab />;
      case 'dashboard':
        return <DashboardSettingsTab />;
      case 'sidebar':
        return <SidebarMenuTab />;
      case 'messages':
        return <MessagesManagerTab currentUser={null} showToast={(m) => alert(m)} showError={(m) => alert(m)} />;
      default:
        return <UserManagementTab />;
    }
  };

  return (
    <AdminSettingsLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="h-full">
        {renderTabContent()}
      </div>
    </AdminSettingsLayout>
  );
};

export default AdminSettings;
