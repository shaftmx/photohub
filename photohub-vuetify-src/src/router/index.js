// Composables
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('@/layouts/default/Default.vue'),
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/views/Home.vue'),
      },
      {
        path: '/photos',
        name: 'Photos',
        component: () => import('@/views/Photos.vue'),
      },
      {
        path: '/views',
        name: 'Views',
        component: () => import('@/views/Views.vue'),
      },
      {
        path: '/upload',
        name: 'Upload',
        component: () => import('@/views/Upload.vue'),
      },
      {
        path: '/logout',
        name: 'Logout',
        component: () => import('@/views/Logout.vue'),
      },
      {
        path: '/login',
        name: 'Login',
        component: () => import('@/views/Login.vue'),
      },
      {
        path: '/unpublished',
        name: 'Unpublished',
        component: () => import('@/views/Unpublished.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
})

export default router
