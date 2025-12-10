// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/tools/string-to-json',
    name: 'StringToJson',
    component: () => import('../views/tools/StringToJson.vue'), // 懒加载
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router