import { DashboardPage } from '@/pages/Dashboard/DashboardPage.jsx'
import { AdminResourcePage } from '@/pages/AdminResource/AdminResourcePage.jsx'
import { AdminUserDetailsPage } from '@/pages/AdminUserDetails/AdminUserDetailsPage.jsx'
import { AdminUserEditPage } from '@/pages/AdminUserEdit/AdminUserEditPage.jsx'
import { AdminMatchDetailsPage } from '@/pages/AdminMatchDetails/AdminMatchDetailsPage.jsx'
import { adminResourceConfigs } from '@/shared/config/adminResources.js'

export const routes = [
  {
    key: 'dashboard',
    path: 'dashboard',
    title: 'Главная',
    component: DashboardPage,
  },
  {
    key: 'userDetails',
    path: 'users/:userId',
    title: ({ userId }) => `Пользователь #${userId}`,
    component: AdminUserDetailsPage,
  },
  {
    key: 'userEdit',
    path: 'users/:userId/edit',
    title: ({ userId }) => `Редактирование #${userId}`,
    component: AdminUserEditPage,
  },
  {
    key: 'matchDetails',
    path: 'matches/:matchId',
    title: ({ matchId }) => `Матч #${matchId}`,
    component: AdminMatchDetailsPage,
  },
  ...Object.values(adminResourceConfigs).map((resource) => ({
    key: resource.key,
    path: resource.path.replace(/^\//, ''),
    title: resource.title,
    component: AdminResourcePage,
    resourceKey: resource.key,
  })),
]
