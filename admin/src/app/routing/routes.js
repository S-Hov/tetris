import { DashboardPage } from '@/pages/Dashboard/DashboardPage.jsx'
import { AdminResourcePage } from '@/pages/AdminResource/AdminResourcePage.jsx'
import { adminResourceConfigs } from '@/shared/config/adminResources.js'

export const routes = [
  {
    key: 'dashboard',
    path: 'dashboard',
    title: 'Главная',
    component: DashboardPage,
  },
  ...Object.values(adminResourceConfigs).map((resource) => ({
    key: resource.key,
    path: resource.path.replace(/^\//, ''),
    title: resource.title,
    component: AdminResourcePage,
    resourceKey: resource.key,
  })),
]
