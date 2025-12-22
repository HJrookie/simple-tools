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
    path: "/tools/json-to-type",
    name: "JsonToType",
    component: () => import("../views/tools/JsonToType.vue"),
  },
  {
    path: "/tools/mock-data-generator",
    name: "MockDataGenerator",
    component: () => import("../views/tools/MockDataGenerator.vue"),
  },
  {
    path: "/tools/css-tailwind-converter",
    name: "CssTailwindConverter",
    component: () => import("../views/tools/CssTailwindConverter.vue"),
  },
  {
    path: "/tools/json-fixer",
    name: "JsonFixer",
    component: () => import("../views/tools/JsonFixer.vue"),
  },
  {
    path: "/tools/css-generator",
    name: "InteractiveCssGenerator",
    component: () => import("../views/tools/InteractiveCssGenerator.vue"),
  },
  {
    path: "/tools/html-renderer",
    name: "HtmlRenderer",
    component: () => import("../views/tools/HtmlRenderer.vue"),
  },
  {
    path: "/tools/log-analyzer",
    name: "LogAnalyzer",
    component: () => import("../views/tools/LogAnalyzer.vue"),
  },
  {
    path: "/tools/nginx-example",
    name: "NginxExample",
    component: () => import("../views/tools/NginxExample.vue"),
  },
  {
    path: "/tools/nginx-log-parser",
    name: "NginxLogParser",
    component: () => import("../views/tools/NginxLogParser.vue"),
  },
  {
    path: "/tools/letencrypt-certbot",
    name: "LetEncryptCertbot",
    component: () => import("../views/tools/LetEncryptCertbot.vue"),
  },
  {
    path: "/tools/markdown-preview",
    name: "MarkdownPreview",
    component: () => import("../views/tools/MarkdownPreview.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
