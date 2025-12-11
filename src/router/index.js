// src/router/index.js
import { createRouter, createWebHistory } from "vue-router";
import Home from "../views/Home.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
  },
  {
    path: "/tools/string-to-json",
    name: "StringToJson",
    component: () => import("../views/tools/StringToJson.vue"),
  },
  // 在这里添加新的路由
  {
    path: "/tools/nginx-formatter",
    name: "NginxFormatter",
    component: () => import("../views/tools/NginxFormatter.vue"), // 懒加载新组件
  },
  {
    path: "/tools/react-renderer",
    name: "ReactRenderer",
    component: () => import("../views/tools/ReactRenderer.vue"),
  },
  {
    path: '/tools/json-to-type',
    name: 'JsonToType',
    component: () => import('../views/tools/JsonToType.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
