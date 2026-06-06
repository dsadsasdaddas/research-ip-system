<script setup>
// 根组件:只放整体布局外壳(顶栏 + 内容区),具体页面由路由切换
</script>

<template>
  <el-container class="app">
    <el-header class="header">
      <span class="logo">📚 科研成果与知识产权管理系统</span>
      <span class="sub">论文模块</span>
    </el-header>
    <el-main>
      <!-- 路由页面在这里渲染 -->
      <router-view />
    </el-main>
  </el-container>
</template>

<style>
/* 全局基础样式 */
html,
body,
#app {
  height: 100%;
  margin: 0;
}
.app {
  height: 100vh;
}
.header {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #304156;
  color: #fff;
}
.header .logo {
  font-size: 18px;
  font-weight: 600;
}
.header .sub {
  opacity: 0.7;
  font-size: 13px;
}
</style>
